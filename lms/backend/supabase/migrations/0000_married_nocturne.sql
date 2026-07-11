CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"date" text NOT NULL,
	"status" text NOT NULL,
	"marked_by" uuid,
	"note" text DEFAULT '',
	"marked_at" timestamp with time zone,
	"academic_year" text DEFAULT '',
	"school_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" uuid PRIMARY KEY NOT NULL,
	"textbook_id" uuid NOT NULL,
	"title" text NOT NULL,
	"order" integer NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"school_id" uuid,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"section" text,
	"room" text,
	"capacity" integer DEFAULT 0,
	"academic_year" text DEFAULT '',
	"status" text DEFAULT 'active',
	"school_id" uuid,
	"student_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concept_notes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"concept_id" uuid NOT NULL,
	"textbook_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"key_points" text DEFAULT '' NOT NULL,
	"formulas" text DEFAULT '' NOT NULL,
	"examples" text DEFAULT '' NOT NULL,
	"learning_objectives" text DEFAULT '' NOT NULL,
	"embedding" vector(384),
	"school_id" uuid,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concept_questions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"concept_id" uuid NOT NULL,
	"textbook_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"question" text NOT NULL,
	"type" text NOT NULL,
	"difficulty" text NOT NULL,
	"options" text[],
	"answer" text NOT NULL,
	"explanation" text DEFAULT '' NOT NULL,
	"passage_text" text,
	"school_id" uuid,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concept_resources" (
	"id" uuid PRIMARY KEY NOT NULL,
	"concept_id" uuid NOT NULL,
	"textbook_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"score" real DEFAULT 0 NOT NULL,
	"embedding" vector(384),
	"school_id" uuid,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concept_videos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"concept_id" uuid NOT NULL,
	"textbook_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"video_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"channel" text DEFAULT '' NOT NULL,
	"thumbnail" text DEFAULT '' NOT NULL,
	"duration" text DEFAULT '' NOT NULL,
	"score" real DEFAULT 0 NOT NULL,
	"embedding" vector(384),
	"school_id" uuid,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concepts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"chapter_id" uuid NOT NULL,
	"textbook_id" uuid NOT NULL,
	"title" text NOT NULL,
	"order" integer NOT NULL,
	"notes" text,
	"video_links" text[] DEFAULT '{}' NOT NULL,
	"school_id" uuid,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"student_id" uuid NOT NULL,
	"fee_structure_id" uuid NOT NULL,
	"amount" numeric NOT NULL,
	"school_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_structures" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid,
	"name" text NOT NULL,
	"amount" numeric NOT NULL,
	"due_date" timestamp with time zone,
	"class_id" uuid,
	"academic_year" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "firestore_docs" (
	"collection" text NOT NULL,
	"doc_id" text NOT NULL,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "firestore_docs_collection_doc_id_pk" PRIMARY KEY("collection","doc_id")
);
--> statement-breakpoint
CREATE TABLE "processing_jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"textbook_id" uuid NOT NULL,
	"status" text DEFAULT 'PROCESSING' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"current_step" text DEFAULT '' NOT NULL,
	"error" text,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_pages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"textbook_id" uuid NOT NULL,
	"page_num" integer,
	"text" text NOT NULL,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"subdomain" text,
	"logo_url" text,
	"primary_color" text,
	"plan" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"plan" text NOT NULL,
	"status" text NOT NULL,
	"student_limit" integer,
	"teacher_limit" integer,
	"features" jsonb,
	"starts_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "textbooks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cover_image" text DEFAULT '' NOT NULL,
	"storage_path" text DEFAULT '' NOT NULL,
	"pdf_url" text DEFAULT '' NOT NULL,
	"academic_year" text DEFAULT '',
	"status" text DEFAULT 'processing' NOT NULL,
	"chapter_count" integer DEFAULT 0 NOT NULL,
	"total_concepts" integer DEFAULT 0 NOT NULL,
	"completed_concepts" integer DEFAULT 0 NOT NULL,
	"failure_reason" text,
	"logs" text[] DEFAULT '{}' NOT NULL,
	"processing_stage" text,
	"processing_progress" integer DEFAULT 0,
	"school_id" uuid,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"role" text NOT NULL,
	"phone_number" text DEFAULT '' NOT NULL,
	"photo_url" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"class_ids" text[] DEFAULT '{}' NOT NULL,
	"class_id" text,
	"student_id" text,
	"roll_no" integer,
	"academic_year" text,
	"children_ids" text[] DEFAULT '{}' NOT NULL,
	"gender" text,
	"password" text,
	"streak_count" integer DEFAULT 0 NOT NULL,
	"last_active_date" text,
	"language" text,
	"school_id" uuid,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_fee_structure_id_fee_structures_id_fk" FOREIGN KEY ("fee_structure_id") REFERENCES "public"."fee_structures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_firestore_docs_collection" ON "firestore_docs" USING btree ("collection");