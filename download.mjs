import youtubedl from 'youtube-dl-exec';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  }
});

function validUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function cleanName(name = 'Mas-Ibram-Media') {
  return String(name).replace(/[\\/:*?"<>|]+/g, '_').slice(0, 150);
}

export default async function handler(req) {
  try {
    const url = new URL(req.url).searchParams.get('url');
    const format = (new URL(req.url).searchParams.get('format') || 'mp4').toLowerCase();
    const quality = (new URL(req.url).searchParams.get('quality') || '720').replace(/p$/i, '');

    if (!url || !validUrl(url)) return json({ error: 'URL tidak valid.' }, 400);
    if (!['mp4', 'mp3'].includes(format)) return json({ error: 'Format tidak didukung.' }, 400);

    const common = {
      noPlaylist: true,
      noWarnings: true,
      noCheckCertificates: true,
      dumpSingleJson: true,
      skipDownload: true,
      socketTimeout: 25,
      retries: 2,
      addHeader: [
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36',
        'accept-language:en-US,en;q=0.9'
      ]
    };

    const opts = format === 'mp3'
      ? { ...common, format: 'bestaudio/best' }
      : {
          ...common,
          format: `best[ext=mp4][height<=${quality}]/best[height<=${quality}]/best`
        };

    const info = await youtubedl(url, opts, { timeout: 50000 });
    const data = typeof info === 'string' ? JSON.parse(info) : info;
    const mediaUrl = data?.url || data?.requested_downloads?.find(x => x?.url)?.url;

    if (!mediaUrl) return json({ error: 'Server berhasil membaca link, tetapi media URL tidak tersedia.' }, 422);

    return json({
      ok: true,
      url: mediaUrl,
      title: data.title || 'Mas-Ibram-Media',
      filename: `${cleanName(data.title || 'Mas-Ibram-Media')}.${format}`,
      format,
      note: format === 'mp3' ? 'Audio URL dikembalikan langsung; konversi MP3 membutuhkan FFmpeg.' : ''
    });
  } catch (error) {
    const message = String(error?.stderr || error?.message || error || 'Gagal memproses link')
      .replace(/\s+/g, ' ').slice(0, 500);
    return json({ error: message }, 502);
  }
}

export const config = { path: '/api/download' };
