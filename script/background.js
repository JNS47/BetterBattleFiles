/*
  listen to download starts
  if a download file is from r-b-a.de and the referrer is from r-b-a.de and includes a BattleID
  message main.js with the download and battle URL
*/
chrome.downloads.onCreated.addListener(download =>{
  //  set default config if config is empty
  getConfig((cfg) =>{
    if(Object.keys(cfg).length < 1)
      setConfigDefaults();
    getConfigOption("extensionIsActive", (result) =>{
      if(result){
        //  RegExp for r-b-a.de Battlepage
        const referrerRegex = new RegExp(/https?:\/\/(www\.)?(\w[\w|-]*\.)?r-b-a\.de\/index\.php\?.*BATTLE=\d+/, 'g');
        //  RegExp for r-b-a.de Battlefile
        const downloadRegex = new RegExp(/^https?:\/\/(www\.)?(\w[\w|-]*\.)?r-b-a\.de\/download\.php\?.*FILE=\d+-\d\.mp3.*$/, 'g');

        //  test referrerRegex with download.referrer and downloadRegex with download.url
        if(referrerRegex.test(download.referrer) && downloadRegex.test(download.url)){
          //  cancel and erase download if true
          chrome.downloads.cancel(download.id, () =>{
            chrome.downloads.erase({id: download.id}, () =>{
              //  get active tab and send message with download and battle URL to it
              chrome.tabs.query({active: true, currentWindow: true}, (tabs) =>{
                chrome.tabs.sendMessage(tabs[0].id,
                                        {url: download.url, battleUrl: download.referrer},
                                        (response) =>{
                  //  log response status (is 200 if message was received)
                  console.log(response?.status ?? "404");
                });
              });
            });
          });
        }
      }
    });
  });
});

/*
  listen to messages
  download file by received url
*/
chrome.runtime.onMessage.addListener((request, sender, sendResponse) =>{
  //  send response of 200 - message received
  sendResponse({status: "200"});
  let fileName = request.fileName.replace(/\*|\?|\||\\|\/|\"|\:|\>|\</g, "");
  console.log(fileName);
                  
  //  add .mp3 extension
  const fileNameWithExtension = `${fileName}.mp3`;
  //  download file
  chrome.downloads.download({
    url: request.url,
    filename: fileNameWithExtension
  });
});