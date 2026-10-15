# Migration contract v1.1

Legacy `smq3-progress`, `smq3-designs`, `smq3-db`, `smq3-lab`, `smq3-ui`, platform and level IDs remain readable. New Track workspaces are additive in `smq3-studio` with schema `smq-studio/1`, included in `smq-backup/1` checksums/validation/quarantine. No IndexedDB migration: current small parameter/geometry descriptors fit localStorage and existing failure UI/backup contract.

A Track owns its designs, guided state, tests, Fab seed/results, comparison pins and Lab state per platform. Historical stars/cards stay shared in legacy progress. Legacy designs enter a Track only through explicit Copy. Track restart retains a revision; protected original precedes Reference Apply. Current tests compare design/platform/mode identity, independent of historical completion.

Old backups omit the optional new key and remain valid. Restore and undo retain the existing transactional/rollback behavior. Invalid new state is quarantined before defaulting; original raw text remains included in incomplete backups. Writes go through SMQ_STORE, including failure feedback; text paste restore remains available with schema/checksum preflight.
