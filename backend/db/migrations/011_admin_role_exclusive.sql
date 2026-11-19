-- An admin account cannot also be a student or a mentor.
-- Student and mentor stay overlapping: one account may still be both.
--
-- A CHECK constraint cannot look at other tables, so the rule is enforced with triggers on
-- all three role tables. Triggers only see new rows, so the migration first refuses to run if
-- an account already breaks the rule.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM admin a
    WHERE EXISTS (SELECT 1 FROM student s WHERE s.user_id = a.user_id)
       OR EXISTS (SELECT 1 FROM mentor m WHERE m.user_id = a.user_id)
  ) THEN
    RAISE EXCEPTION
      'Cannot apply: some accounts are an admin and also a student or a mentor. Remove the extra role rows first.';
  END IF;
END
$$;

-- Runs before a row is added to admin: refuse if the user is already a student or a mentor.
CREATE FUNCTION forbid_admin_with_other_role() RETURNS trigger AS $$
BEGIN
  -- Lock the user's row first, so two concurrent inserts (an admin and a student) are
  -- serialized: the second one waits, then sees the first one's committed row.
  PERFORM 1 FROM "user" WHERE id = NEW.user_id FOR UPDATE;

  IF EXISTS (SELECT 1 FROM student WHERE user_id = NEW.user_id)
     OR EXISTS (SELECT 1 FROM mentor WHERE user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'an admin cannot also be a student or a mentor'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Runs before a row is added to student or mentor: refuse if the user is already an admin.
CREATE FUNCTION forbid_student_or_mentor_for_admin() RETURNS trigger AS $$
BEGIN
  PERFORM 1 FROM "user" WHERE id = NEW.user_id FOR UPDATE;

  IF EXISTS (SELECT 1 FROM admin WHERE user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'an admin cannot also be a student or a mentor'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_not_student_or_mentor
  BEFORE INSERT OR UPDATE OF user_id ON admin
  FOR EACH ROW EXECUTE FUNCTION forbid_admin_with_other_role();

CREATE TRIGGER student_not_admin
  BEFORE INSERT OR UPDATE OF user_id ON student
  FOR EACH ROW EXECUTE FUNCTION forbid_student_or_mentor_for_admin();

CREATE TRIGGER mentor_not_admin
  BEFORE INSERT OR UPDATE OF user_id ON mentor
  FOR EACH ROW EXECUTE FUNCTION forbid_student_or_mentor_for_admin();
