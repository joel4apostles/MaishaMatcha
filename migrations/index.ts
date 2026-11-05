import * as migration_20261105_194241_initial from './20261105_194241_initial';
import * as migration_20261105_212901_schema_hardening from './20261105_212901_schema_hardening';
import * as migration_20261105_221949_pos_sales_a from './20261105_221949_pos_sales_a';
import * as migration_20261105_221955_pos_sales_b from './20261105_221955_pos_sales_b';
import * as migration_20261105_223038_refunds from './20261105_223038_refunds';
import * as migration_20261105_223929_inventory_suppliers from './20261105_223929_inventory_suppliers';
import * as migration_20261105_224951_online_orders from './20261105_224951_online_orders';
import * as migration_20261105_231005_members_events_campaigns from './20261105_231005_members_events_campaigns';
import * as migration_20261105_231006_members_tier_default from './20261105_231006_members_tier_default';

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
    name: '20261105_223038_refunds',
  },
  {
    up: migration_20261105_223929_inventory_suppliers.up,
    down: migration_20261105_223929_inventory_suppliers.down,
    name: '20261105_223929_inventory_suppliers',
  },
  {
    up: migration_20261105_224951_online_orders.up,
    down: migration_20261105_224951_online_orders.down,
    name: '20261105_224951_online_orders',
  },
  {
    up: migration_20261105_231005_members_events_campaigns.up,
    down: migration_20261105_231005_members_events_campaigns.down,
    name: '20261105_231005_members_events_campaigns',
  },
  {
    up: migration_20261105_231006_members_tier_default.up,
    down: migration_20261105_231006_members_tier_default.down,
    name: '20261105_231006_members_tier_default',
  },
];
