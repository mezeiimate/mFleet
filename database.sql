-- public.sticker_types definition

-- Drop table

-- DROP TABLE public.sticker_types;

CREATE TABLE public.sticker_types (
	id serial4 NOT NULL,
	"name" varchar(100) NOT NULL,
	vehicle_category varchar(50) NULL,
	price int4 DEFAULT 0 NULL,
	duration varchar(50) DEFAULT 'Éves'::character varying NULL,
	territory varchar(50) DEFAULT 'Országos'::character varying NULL,
	CONSTRAINT sticker_types_pkey PRIMARY KEY (id)
);


-- public.users definition

-- Drop table

-- DROP TABLE public.users;

CREATE TABLE public.users (
	id serial4 NOT NULL,
	username varchar(50) NOT NULL,
	"password" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"role" varchar(20) NOT NULL,
	CONSTRAINT users_pkey PRIMARY KEY (id),
	CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('admin'::character varying)::text, ('operator'::character varying)::text, ('driver'::character varying)::text]))),
	CONSTRAINT users_username_key UNIQUE (username)
);


-- public.vehicles definition

-- Drop table

-- DROP TABLE public.vehicles;

CREATE TABLE public.vehicles (
	id serial4 NOT NULL,
	license_plate varchar(20) NOT NULL,
	brand varchar(50) NULL,
	model varchar(50) NULL,
	year_of_manufacture int4 NULL,
	vin varchar(20) NULL,
	fuel_type varchar(50) NULL,
	transmission varchar(50) NULL,
	engine_capacity int4 NULL,
	current_km int4 NULL,
	status varchar(50) DEFAULT 'Aktív'::character varying NULL,
	technical_exam_until date NULL,
	user_id int4 NULL,
	category varchar(10) DEFAULT 'D1'::character varying NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT vehicles_license_plate_key UNIQUE (license_plate),
	CONSTRAINT vehicles_pkey PRIMARY KEY (id),
	CONSTRAINT vehicles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
);


-- public.service_logs definition

-- Drop table

-- DROP TABLE public.service_logs;

CREATE TABLE public.service_logs (
	id serial4 NOT NULL,
	vehicle_id int4 NULL,
	description text NOT NULL,
	status varchar(50) DEFAULT 'Függőben'::character varying NULL,
	"cost" int4 DEFAULT 0 NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT service_logs_pkey PRIMARY KEY (id),
	CONSTRAINT service_logs_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE
);


-- public.vehicle_stickers definition

-- Drop table

-- DROP TABLE public.vehicle_stickers;

CREATE TABLE public.vehicle_stickers (
	id serial4 NOT NULL,
	vehicle_id int4 NULL,
	sticker_type_id int4 NULL,
	valid_until date NULL,
	purchase_price int4 DEFAULT 0 NULL,
	issued_at date DEFAULT CURRENT_DATE NULL,
	CONSTRAINT vehicle_stickers_pkey PRIMARY KEY (id),
	CONSTRAINT vehicle_stickers_sticker_type_id_fkey FOREIGN KEY (sticker_type_id) REFERENCES public.sticker_types(id) ON DELETE CASCADE,
	CONSTRAINT vehicle_stickers_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE
);