# Migration and Rollback

Additive migration only. `smq3-studio` retains schema smq-studio/1, active/by Track workspaces and all unknown existing fields. Optional journey object is separate from legacy by map; Tutorial/MZM designs and progress are independent. `smq3-lab`, designs, cards, stars, Fab, DB, snapshots and backup schema smq-backup/1 remain unchanged. No automatic history→new completion mapping.

A beta.2 backup without journey imports through the original checksum/restore pipeline; on start the user is offered Tutorial. A current backup includes journey in the existing studio key. Save failures use existing store status and backup UI. Invalid journey structure is rejected by backup validation and startup quarantines malformed source before replacement. Stored evidence is advisory: recalculated current dependencies and valid fields gate Next.

Rollback: create a full text backup before testing alpha.1. Use original Restore Undo to restore prior data. To run beta.2, restore that pre-alpha backup there; beta.2 ignores additive journey and can preserve legacy Track records, but may drop the new field on further saves. Keep alpha backup separately for forward resume. Never promise alpha completion survives a beta.2 overwrite.

Tests must cover old fixture restore, new backup validation, exact non-curriculum data preservation, restore/reload, resume at current step, independent platform/Track state and stale evidence after edits.
