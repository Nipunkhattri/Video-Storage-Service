CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    size BIGINT NOT NULL,
    duration INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'UPLOADING' CHECK (status IN ('UPLOADING', 'PROCESSING', 'READY')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE thumbnails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    s3_key VARCHAR(500) NOT NULL,
    timestamp INTEGER NOT NULL,
    position INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE share_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    visibility VARCHAR(20) NOT NULL CHECK (visibility IN ('PUBLIC', 'PRIVATE')),
    allowed_emails TEXT[],
    expires_at TIMESTAMP WITH TIME ZONE,
    last_viewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE share_link_otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    share_link_id UUID NOT NULL REFERENCES share_links(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(32) NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_share_link_otps_share_link_id ON share_link_otps(share_link_id);
CREATE INDEX idx_share_link_otps_email ON share_link_otps(email);

CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX idx_thumbnails_video_id ON thumbnails(video_id);
CREATE INDEX idx_share_links_video_id ON share_links(video_id);
CREATE INDEX idx_share_links_user_id ON share_links(user_id);
CREATE INDEX idx_share_links_token ON share_links(token);
CREATE INDEX idx_share_links_expires_at ON share_links(expires_at);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE thumbnails ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own videos" ON videos
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own videos" ON videos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos" ON videos
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view thumbnails of their videos" ON thumbnails
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM videos 
            WHERE videos.id = thumbnails.video_id 
            AND videos.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert thumbnails for their videos" ON thumbnails
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM videos 
            WHERE videos.id = thumbnails.video_id 
            AND videos.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own share links" ON share_links
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own share links" ON share_links
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own share links" ON share_links
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own share links" ON share_links
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Public access to shared videos" ON videos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM share_links 
            WHERE share_links.video_id = videos.id 
            AND share_links.visibility = 'PUBLIC'
            AND (share_links.expires_at IS NULL OR share_links.expires_at > NOW())
        )
    );

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
