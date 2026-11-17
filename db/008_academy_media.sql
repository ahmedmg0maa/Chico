-- Private bounded training clips; no public bucket or anonymous reads.
CREATE TABLE IF NOT EXISTS chico_next.academy_media (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 lesson text NOT NULL CHECK(lesson IN ('jail','mute')),
 mime text NOT NULL CHECK(mime IN ('video/mp4','video/webm','video/quicktime')),
 total_bytes integer NOT NULL CHECK(total_bytes BETWEEN 1 AND 52428800),
 ready boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(lesson,ready)
);
CREATE TABLE IF NOT EXISTS chico_next.academy_chunks (
 media_id uuid NOT NULL REFERENCES chico_next.academy_media(id) ON DELETE CASCADE,
 idx integer NOT NULL CHECK(idx BETWEEN 0 AND 49),
 data bytea NOT NULL CHECK(octet_length(data) BETWEEN 1 AND 1048576),
 PRIMARY KEY(media_id,idx)
);
ALTER TABLE chico_next.academy_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE chico_next.academy_chunks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON chico_next.academy_media,chico_next.academy_chunks FROM PUBLIC,anon,authenticated;
