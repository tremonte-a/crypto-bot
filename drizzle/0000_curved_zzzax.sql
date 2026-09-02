CREATE TABLE "bots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pair" text NOT NULL,
	"recipe" text NOT NULL,
	"buy_threshold_pct" real NOT NULL,
	"sell_threshold_pct" real NOT NULL,
	"buy_amount" real NOT NULL,
	"sell_amount" real NOT NULL,
	"max_position" real,
	"min_quote_reserve" real,
	"is_active" boolean DEFAULT false,
	"reference_price" real,
	"momentum_sensitivity" real DEFAULT 0.5,
	"max_dynamic_shift_pct" real DEFAULT 5,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "price_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bot_id" uuid,
	"price" real NOT NULL,
	"buy_line" real,
	"sell_line" real,
	"momentum" real,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE no action ON UPDATE no action;