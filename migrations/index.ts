import * as migration_20261105_194241_initial from './20261105_194241_initial';
import * as migration_20261105_212901_schema_hardening from './20261105_212901_schema_hardening';
import * as migration_20261105_221949_pos_sales_a from './20261105_221949_pos_sales_a';
import * as migration_20261105_221955_pos_sales_b from './20261105_221955_pos_sales_b';
import * as migration_20261105_223038_refunds from './20261105_223038_refunds';
import * as migration_20261105_223929_inventory_suppliers from './20261105_223929_inventory_suppliers';
import * as migration_20261105_224951_online_orders from './20261105_224951_online_orders';
import * as migration_20261105_231005_members_events_campaigns from './20261105_231005_members_events_campaigns';
import * as migration_20261105_231006_members_tier_default from './20261105_231006_members_tier_default';
import * as migration_20261105_231007_lowercase_order_emails from './20261105_231007_lowercase_order_emails';
import * as migration_20261105_233005_shop_premium from './20261105_233005_shop_premium';
import * as migration_20261105_234950_subscription_event_at from './20261105_234950_subscription_event_at';
import * as migration_20261106_005146_full_invoices from './20261106_005146_full_invoices';

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
  {
    up: migration_20261105_231007_lowercase_order_emails.up,
    down: migration_20261105_231007_lowercase_order_emails.down,
    name: '20261105_231007_lowercase_order_emails',
  },
  {
    up: migration_20261105_233005_shop_premium.up,
    down: migration_20261105_233005_shop_premium.down,
    name: '20261105_233005_shop_premium',
  },
  {
    up: migration_20261105_234950_subscription_event_at.up,
    down: migration_20261105_234950_subscription_event_at.down,
    name: '20261105_234950_subscription_event_at',
  },
  {
    up: migration_20261106_005146_full_invoices.up,
    down: migration_20261106_005146_full_invoices.down,
    name: '20261106_005146_full_invoices'
  },
];
