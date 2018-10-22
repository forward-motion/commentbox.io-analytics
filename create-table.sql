CREATE TABLE requests (
    id text NOT NULL,
    user_id text,
    page_url text,
    page_domain text,
    page_path text,
    referer text,
    referer_domain text,
    referer_path text,
    user_agent text,
    time_taken_micros integer,
    request_time timestamp with time zone
);