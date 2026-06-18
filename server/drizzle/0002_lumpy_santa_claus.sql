CREATE TABLE `ai_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'openai-compatible' NOT NULL,
	`base_url` text NOT NULL,
	`api_key` text,
	`model` text NOT NULL,
	`params` text,
	`enabled` integer DEFAULT true NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `self_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`self_intro` text,
	`offer` text,
	`looking_for` text,
	`tone_preference` text,
	`extra_context` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `self_profiles_user_id_unique` ON `self_profiles` (`user_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `person_id` text REFERENCES persons(id);