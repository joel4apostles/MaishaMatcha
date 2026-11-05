import * as migration_20261105_194241_initial from './20261105_194241_initial';
import * as migration_20261105_212901_schema_hardening from './20261105_212901_schema_hardening';

export const migrations = [
  {
    up: migration_20261105_194241_initial.up,
    down: migration_20261105_194241_initial.down,
    name: '20261105_194241_initial',
  },
  {
    up: migration_20261105_212901_schema_hardening.up,
    down: migration_20261105_212901_schema_hardening.down,
    name: '20261105_212901_schema_hardening'
  },
];
