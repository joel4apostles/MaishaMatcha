import * as migration_20261105_194241_initial from './20261105_194241_initial';
import * as migration_20261105_212901_schema_hardening from './20261105_212901_schema_hardening';
import * as migration_20261105_221949_pos_sales_a from './20261105_221949_pos_sales_a';
import * as migration_20261105_221955_pos_sales_b from './20261105_221955_pos_sales_b';
import * as migration_20261105_223038_refunds from './20261105_223038_refunds';

export const migrations = [
  {
    up: migration_20261105_194241_initial.up,
    down: migration_20261105_194241_initial.down,
    name: '20261105_194241_initial',
  },
  {
    up: migration_20261105_212901_schema_hardening.up,
    down: migration_20261105_212901_schema_hardening.down,
    name: '20261105_212901_schema_hardening',
  },
  {
    up: migration_20261105_221949_pos_sales_a.up,
    down: migration_20261105_221949_pos_sales_a.down,
    name: '20261105_221949_pos_sales_a',
  },
  {
    up: migration_20261105_221955_pos_sales_b.up,
    down: migration_20261105_221955_pos_sales_b.down,
    name: '20261105_221955_pos_sales_b',
  },
  {
    up: migration_20261105_223038_refunds.up,
    down: migration_20261105_223038_refunds.down,
    name: '20261105_223038_refunds'
  },
];
