/* eslint-disable no-unused-vars */
const { Pool } = require('pg');
const IDatabasePort = require('../../domain/ports/IDatabasePort');
const Video = require('../../domain/aggregates/video');  
const Snapshot = require('../../domain/entities/snapshot');
const CodeSnippet = require('../../domain/entities/codeSnippet');
const TextSnippet = require('../../domain/entities/textSnippet');
const Transcript = require('../../domain/entities/transcript');

class PostgresAdapter extends IDatabasePort {
  constructor() {
    super();
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async saveVideo(video) {
    const client = await this.pool.connect();
    try {
      const sql = 'INSERT INTO videos (id, youtube_id, title, author, duration, description) VALUES ($1, $2, $3, $4, $5, $6)';
      await client.query(sql, [video.videoId, video.youtubeId, video.title, video.author, video.duration, video.description]);
    } finally {
      client.release();
    }
  }

  async findVideoById(id) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM videos WHERE id=$1', [id]);
      return rows.length ? rows[0] : null;
    } finally {
      client.release();
    }
  }

  async findAllVideos() {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM videos');
      return rows;
    } finally {
      client.release();
    }
  }

  async saveSnapshot(videoYoutubeId, snapshot) {
    const client = await this.pool.connect();
    try {
      const sql = 'INSERT INTO snapshots (id, video_youtube_id, timestamp) VALUES ($1, $2, $3)';
      await client.query(sql, [snapshot.snapshotId, videoYoutubeId, snapshot.timestamp]);
    } finally {
      client.release();
    }
  }

  async findSnapshotById(id) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM snapshots WHERE id=$1', [id]);
      return rows.length ? rows[0] : null;
    } finally {
      client.release();
    }
  }

  async findAllSnapshotsByVideoId(videoId) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM snapshots WHERE video_id=$1', [videoId]);
      return rows;
    } finally {
      client.release();
    }
  }

  async saveCodeSnippet(codeSnippet) {
    const client = await this.pool.connect();
    try {
      const sql = 'INSERT INTO code_snippets (id, snapshot_id, code) VALUES ($1, $2, $3)';
      await client.query(sql, [codeSnippet.codeSnippetId, codeSnippet.snapshotId, codeSnippet.code]);
    } finally {
      client.release();
    }
  }

  async findCodeSnippetById(id) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM code_snippets WHERE id=$1', [id]);
      return rows.length ? rows[0] : null;
    } finally {
      client.release();
    }
  }

  async findAllCodeSnippetsbyVideoId(videoId) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM code_snippets WHERE video_id=$1', [videoId]);
      return rows;
    } finally {
      client.release();
    }
  }

  async saveTextSnippet(textSnippetId, snapshotId, text) {
    const client = await this.pool.connect();
    try {
      const sql = 'INSERT INTO text_snippets (id, snapshot_id, text) VALUES ($1, $2, $3)';
      await client.query(sql, [textSnippetId, snapshotId, text]);
    } finally {
      client.release();
    }
  }

  async findTextSnippetById(id) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT text FROM text_snippets WHERE id=$1', [id]);
      return rows.length ? rows[0].text : null;
    } finally {
      client.release();
    }
  }

  async findAllTextSnippetsbyVideoId(videoId) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT text FROM text_snippets WHERE video_id=$1', [videoId]);
      return rows.map(row => row.text);
    } finally {
      client.release();
    }
  }

  async saveTranscript(transcript, videoYoutubeId) {
    const client = await this.pool.connect();
    try {
      const sql = 'INSERT INTO transcripts (id, video_youtube_id, content) VALUES ($1, $2, $3)';
      await client.query(sql, [transcript.transcriptId, videoYoutubeId, transcript.text]);
    } finally {
      client.release();
    }
  }

  async findTranscriptByVideoId(id) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM transcripts WHERE video_youtube_id=$1', [id]);
      return rows.length ? rows[0] : null;
    } finally {
      client.release();
    }
  }

  async saveVideoData(videoDataDTO, videoYoutubeId) {
    const client = await this.pool.connect();
    try {
      const sql = 'INSERT INTO video_data (youtube_id, title, author, duration, description) VALUES ($1, $2, $3, $4, $5)';
      await client.query(sql, [videoYoutubeId, videoDataDTO.title, videoDataDTO.author, videoDataDTO.duration, videoDataDTO.description]);
    } finally {
      client.release();
    }
  }

  async findVideoDataByVideoId(id) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM video_data WHERE youtube_id=$1', [id]);
      return rows.length ? rows[0] : null;
    } finally {
      client.release();
    }
  }
}

module.exports = PostgresAdapter;