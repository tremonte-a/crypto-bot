ALTER TABLE "orders" DROP CONSTRAINT "orders_bot_id_bots_id_fk";
--> statement-breakpoint
ALTER TABLE "price_snapshots" DROP CONSTRAINT "price_snapshots_bot_id_bots_id_fk";
--> statement-breakpoint
ALTER TABLE "trades" DROP CONSTRAINT "trades_bot_id_bots_id_fk";
--> statement-breakpoint
ALTER TABLE "trades" DROP CONSTRAINT "trades_order_id_orders_id_fk";
--> statement-breakpoint
ALTER TABLE "bots" ADD COLUMN "pending_order_id" text;--> statement-breakpoint
ALTER TABLE "bots" ADD COLUMN "pending_order_side" text;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;