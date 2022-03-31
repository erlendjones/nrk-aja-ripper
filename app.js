import http from 'http';
import fs from 'fs';
import axios from 'axios';
import debug from 'debug';
const Debug = debug('AJA-Ripper');

const ip = '192.168.20.5';

const initScheduler = function(check){
	Debug('App Inited')
	setInterval(checkList, 2000);
}

const downloadList = [];
let isDownloading = false;

const runDownload = async () => {
	if (!isDownloading && downloadList.length){
		isDownloading = true;
		const clipname = downloadList[0];

		await setDownloadMode();

		download('http://'+ip+'/media/'+clipname, __dirname+'/'+clipname, async (err)=>{
			downloadList.shift();
			isDownloading = false;

			await resetDownloadMode();

			if (err){
				Debug('error downloading', clipname);
				return;
			}

			Debug('file downloaded', clipname);
			runDownload();
		});
	}
};


let isChecking = false;
const checkList = function(){
	if (isChecking) return;

	Debug('checking AJA file-list');
	isChecking = true;
	// get list
	axios.get('http://'+ip+'/clips?action=get_clips').then(res=>{
		
		const list = res.data.clips;
		const clipnames = list.map(_=>_.clipname);
		const newClipnames = [];

		// check for existing files
		clipnames.forEach(async clipname => {
				await fileExist(clipname, (downloadFilename)=>{
					newClipnames.push(downloadFilename);
				})
		});

		// if new files, download them
		if (newClipnames.length){
			Debug(''+clipnames.length+' files in total, '+newClipnames.length+' is new.');
			Debug('download', downloadFilename);
			downloadList.concat(newClipnames);
			runDownload();
		}else{
			Debug(''+clipnames.length+' files, but no new ones.');
		}

		isChecking = false;
	})
};


const fileExist = function(file, cb){
	const path = file;
	try {
		if (fs.existsSync(path)) {
			Debug('already exist');
		}else{
			Debug('download');
			cb(file);
		}
	} catch(err) {
		console.error(err)
	}
}


const download = function(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = http.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);  // close() is async, call cb after close completes.
    });
  }).on('error', function(err) { // Handle errors
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
    if (cb) cb(err.message);
  });
};

const setDownloadMode = async () => {
	return axios.get('http://'+ip+'/config?action=set&paramid=eParamID_MediaState&value=1')
}

const resetDownloadMode = async () => {
	await axios.get('http://'+ip+'/config?action=set&paramid=eParamID_MediaState&value=0')
}


// 192.168.20.5

initScheduler();