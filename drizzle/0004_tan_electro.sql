CREATE TABLE "bot_status" (
	"bot_id" uuid PRIMARY KEY NOT NULL,
	"current_price" real,
	"momentum" real,
	"buy_shift" real,
	"sell_shift" real,
	"effective_buy_threshold" real,
	"effective_sell_threshold" real,
	"buy_trigger_price" real,
	"sell_trigger_price" real,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "bot_status" ADD CONSTRAINT "bot_status_bot_id_bots_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bots"("id") ON DELETE cascade ON UPDATE no action;