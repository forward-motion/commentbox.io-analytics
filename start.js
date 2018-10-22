const crypto = require('crypto');
const { URL } = require('url');
const { Writable } = require('stream');
const admin = require('firebase-admin');
const parse = require('csv-parse');
const { Client } = require('pg');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


const db = new Client();
db.connect();

const insert = `
  INSERT INTO requests(id, user_id, page_url, page_domain, page_path, referer, referer_domain, referer_path, user_agent, time_taken_micros, request_time)
  VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  ON CONFLICT DO NOTHING;`;

const states = `
SELECT 
       COUNT(DISTINCT user_id) AS visits, 
       referer_domain, 
       date(request_time) as request_date 
FROM requests 
GROUP BY referer_domain, request_date 
ORDER BY request_date DESC, visits DESC
`; // use this when querying for stats

const inStream = admin.storage()
    .bucket(process.env.LOGS_BUCKET)
    .getFilesStream();

const outStream = new Writable({
    objectMode: true,
    write(file, encoding, callback) {

        const [ bucket, suffix ] = file.name.split(process.env.BUCKET_DOMAINS);

        if (suffix.startsWith('storage_')) {
            return callback();
        }


        const log = admin.storage()
            .bucket(file.metadata.bucket)
            .file(file.metadata.name)
            .createReadStream()
            .on('error', callback);

        const parser = parse({
            cast: false,
            columns: true
        }).on('error', callback);

        const write = new Writable({
            objectMode: true,
            write(row, encoding, callback) {

                const {
                    s_request_id: requestId,
                    c_ip: ip,
                    cs_referer: page,
                    cs_uri: uri,
                    cs_user_agent: userAgent,
                    time_taken_micros: timeTaken,
                    time_micros: time
                } = row;

                const userId = crypto.createHmac('sha1', serviceAccount.private_key).update(ip).digest('hex');
                let pageDomain = '';
                let pagePath = '';
                if (page) {
                    try {
                        const pageUrl = new URL(page);
                        pageDomain = pageUrl.host.toLowerCase();
                        pagePath = pageUrl.pathname.toLowerCase();
                    } catch (err) {

                    }
                }
                const analyticsUrl = new URL(`https://commentbox.io/${uri}`);
                const referer = analyticsUrl.searchParams.get('ref') || '';
                let refererDomain = '';
                let refererPath = '';
                if (referer) {
                    try {
                        const refererUrl = new URL(referer);
                        refererDomain = refererUrl.host.toLowerCase();
                        refererPath = refererUrl.pathname.toLowerCase();
                    } catch (err) {

                    }
                }

                db.query(insert, [
                    requestId,
                    userId,
                    page,
                    pageDomain,
                    pagePath,
                    referer,
                    refererDomain,
                    refererPath,
                    userAgent,
                    parseInt(timeTaken),
                    (new Date(parseInt(time) / 1000)).toISOString()
                ], callback);
            }
        }).on('error', callback);


        log.pipe(parser).pipe(write).on('finish', callback);
    }
});


inStream.pipe(outStream).on('error', console.log).on('finish', () => console.log('Finished.'));