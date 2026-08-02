-- Legacy reviews contain ambiguous +/- suggestion strings that cannot be
-- converted losslessly into structured line arrays. Keep snippets and require
-- a fresh review rather than exposing unsafe apply actions.
DELETE FROM "Review";
