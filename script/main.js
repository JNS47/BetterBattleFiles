/*
  listen to messages
  manipulate file and message background.js to download
*/
chrome.runtime.onMessage.addListener((request, sender, sendResponse) =>{
  //  send response of 200 - message received
  sendResponse({status: "200"});
  
  //  get the splitted url (into battleID and roundID)
  const urlIDs = splitUrl(request.url);
  //  get battleRound information such as challenger, opponent, artist (of the round), ...
  const battleRoundVariables = getBattleRoundVariables(request.battleUrl, urlIDs.battleID, urlIDs.roundID);
  
  //  get templates from config, set data and initiate download
  battleRoundVariables.then((res) =>{
    getConfig(async (cfg) =>{
      let frames = [];
      let fileName;
      for(let cfgItem in cfg){
        let frame = getFrame(cfgItem, cfg[cfgItem], res);
        if(frame){
          if(frame.name === "FILENAME"){
            fileName = frame.value;
          } else{
            frames = [...frames, frame];
          }
        }
      }
      frames = [...frames,
        getFrame(
          "date",
          `${res.round.date.day}${res.round.date.month}`,
          res
        ),
        getFrame(
          "year",
          `${res.round.date.year}`,
          res
        )
      ];
      //  download unchanged file
      const blob = await fetch(request.url).then((res) => res.blob());
      
      //  get buffer
      const fr = new FileReader();
      fr.onload = function(){
        //  set frames and start download of changed file
        setFrames(this.result, frames, (downloadUrl) =>{
          chrome.runtime.sendMessage({url: downloadUrl, fileName: fileName}, (response) =>{
            //  log response status (is 200 if message was received)
            console.log(response?.status ?? "404");
          });
        });
      }
      fr.readAsArrayBuffer(blob);
    });
  });
});

//  split the URL into battleID and roundID and return them as object
function splitUrl(downloadUrl){
  return {
    //  e.g. "https://r-b-a.de/download.php?FILE=26980-2.mp3&PATH=5" --> 26980
    battleID: downloadUrl.match(new RegExp(/(?<=FILE=)\d+(?=-\d\.mp3)/, 'g'))[0],
    //  e.g. "https://r-b-a.de/download.php?FILE=26980-2.mp3&PATH=5" --> 2
    roundID: downloadUrl.match(new RegExp(/(?<=FILE=\d+-)\d(?=\.mp3)/, 'g'))[0]
  };
}

//  get battleRound information such as challenger, opponent, artist (of the round), ...
async function getBattleRoundVariables(battleUrl, battleID, roundID){
  const data = await getRelevantDataFromHTML(battleUrl, roundID);
  return {
    battle:{
      id: battleID,
      challenger:{
        name: getBattleChallenger(data.battle),
        points: data.battle.match(new RegExp(/(?<=\()-?\d*(?= : -?\d*\)$)/, 'g'))[0]
      },
      opponent:{
        name: getBattleOpponent(data.battle),
        points: data.battle.match(new RegExp(/(?<=\(-?\d* : )-?\d*(?=\)$)/, 'g'))[0]
      }
    },
    round:{
      date:{
        day: data.round.dateTime.match(new RegExp(/^\d+/, 'g'))[0],
        month: data.round.dateTime.match(new RegExp(/(?<=^\d+\.)\d+/, 'g'))[0],
        year: data.round.dateTime.match(new RegExp(/(?<=^\d+\.\d+\.)\d+/, 'g'))[0],
      },
      time:{
        hours: data.round.dateTime.match(new RegExp(/(?<=^\d+\.\d+\.\d+ )\d+/, 'g'))[0],
        minutes: data.round.dateTime.match(new RegExp(/(?<=^\d+\.\d+\.\d+ \d+:)\d+/, 'g'))[0],
        seconds: data.round.dateTime.match(new RegExp(/(?<=^\d+\.\d+\.\d+ \d+:\d+:)\d+/, 'g'))[0],
        millionthSeconds: (data.round.dateTime.match(
                        new RegExp(/(?<=^\d+\.\d+\.\d+ \d+:\d+:\d+\.)\d+$/, 'g')
        ) || new Array("0"))[0], // if no millionthSeconds (old battles) exist, take 0 as millionthSeconds
      },
      artist: data.round.artist,
      opponent: getRoundOpponent(
                  data.round.artist,
                  getBattleChallenger(data.battle),
                  getBattleOpponent(data.battle)
      ),
      name: getRoundName(roundID),
      number: getRoundNumber(roundID),
      id: roundID
    }
  };
}

//  fetch HTML from battle page, get relevant information and split them
async function getRelevantDataFromHTML(battleUrl, roundID){
  //  fetch HTML from battle page and remove all new-lines
  const htmlContent = await fetch(battleUrl).then(async (res) =>{
    const text = (await res.text()).replace(/(\r\n|\n|\r)/gm,"");
    return text;
  });
  //  get roundData (artist, date, downloads)
  const roundData = htmlContent
    .match(new RegExp(/(?<=<tr>)<td><a.*?FILE=\d+-\d+\.mp3.*?(?=<\/tr>)/, 'g'))
    .filter((el) => el.includes(`-${roundID}.mp3`))[0]
    .match(new RegExp(/(?<=<\/td><td>).*?(?=<\/td>)/, 'g'));
  //  get battleData (challenger, opponent, points)
  const battleData = htmlContent.match(new RegExp(/(?<=Battledetails.*<h2>).*(?=<\/h2>)/, 'g'))[0];
  
  return {
    battle: battleData,
    round: {
      dateTime: roundData[0],
      artist: roundData[1]
    }
  };
}

//  get roundNumber by roundId (number of HR1, RR1, ...)
function getRoundNumber(roundId){
  if(roundId < 4)
    return 1;
  else if(roundId < 7)
    return 2;
  return 3;
}

//  get roundNumber by roundId (chars of HR1, RR1, ...)
function getRoundName(roundId){
  if(roundId == 1 || roundId == 4 || roundId == 7)
     return "BEAT";
  else if(roundId == 2 || roundId == 5 || roundId == 8)
    return "HR";
  return "RR";
}

//  get the opponent of the round (which differs from the battle opponent)
function getRoundOpponent(roundArtist, battleChallenger, battleOpponent){
  if(roundArtist === battleChallenger)
    return battleOpponent;
  return battleChallenger;
}

//  get the challenger of the battle
function getBattleChallenger(battleData){
  return battleData.match(new RegExp(/^.+?(?= vs. .+ \(-?\d* : -?\d*\)$)/, 'g'))[0];
}

//  get the opponent of the battle (which differs from the round opponent)
function getBattleOpponent(battleData){
  return battleData.match(new RegExp(/(?<=^.+? vs. ).+?(?= \(-?\d* : -?\d*\)$)/, 'g'))[0];
}

//  get the frame name and manipulate the value to fit the frame
function getFrame(alias, value, variableObject){
  let frameName;
  let frameValue;
  value = replaceVariables(value, variableObject);
  switch(alias){
    case "template_filename":
      frameName = "FILENAME";
      frameValue = value;
      break;
    case "template_albumtitle":
      frameName = "TALB";
      frameValue = value;
      break;
    case "template_albumartist":
      frameName = "TPE2";
      frameValue = value;
      break;
    case "template_title":
      frameName = "TIT2";
      frameValue = value;
      break;
    case "template_subtitle":
      frameName = "TIT3";
      frameValue = value;
      break;
    case "template_tracknmbr":
      frameName = "TRCK";
      frameValue = value;
      break;
    case "template_artist":
      frameName = "TPE1";
      frameValue = new Array(value);
      break;
    case "template_genre":
      frameName = "TCON";
      frameValue = value.split(new RegExp(/\|\|/, 'g'));
      break;
    case "template_language":
      frameName = "TLAN";
      frameValue = value;
      break;
    case "date":
      frameName = "TDAT";
      frameValue = parseInt(value);
      break;
    case "year":
      frameName = "TYER";
      frameValue = parseInt(value);
      break;
  }
  if(frameName && frameValue)
    return {
      name: frameName,
      value: frameValue
    };
}

//  replace all variable placeholders in a string with the actual variable value
function replaceVariables(value, variableObject){
  if(typeof value === "string"){
    value =
    value.replace(new RegExp(/(?<!\\)%BATTLEID%/, 'g'),
                  variableObject.battle.id)
          .replace(new RegExp(/(?<!\\)%HERAUSFORDERER%/, 'g'),
                  variableObject.battle.challenger.name)
          .replace(new RegExp(/(?<!\\)%HERAUSFORDERER_PUNKTE%/, 'g'),
                  variableObject.battle.challenger.points)
          .replace(new RegExp(/(?<!\\)%GEGNER%/, 'g'),
                  variableObject.battle.opponent.name)
          .replace(new RegExp(/(?<!\\)%GEGNER_PUNKTE%/, 'g'),
                  variableObject.battle.opponent.points)
          .replace(new RegExp(/(?<!\\)%RUNDE_MC%/, 'g'),
                  variableObject.round.artist)
          .replace(new RegExp(/(?<!\\)%RUNDE_GEGNER%/, 'g'),
                  variableObject.round.opponent)
          .replace(new RegExp(/(?<!\\)%RUNDE_NAME%/, 'g'),
                  variableObject.round.name)
          .replace(new RegExp(/(?<!\\)%RUNDE_NUMMER%/, 'g'),
                  variableObject.round.number)
          .replace(new RegExp(/(?<!\\)%RUNDE_ID%/, 'g'),
                  variableObject.round.id)
          .replace(new RegExp(/(?<!\\)%DATUM%/, 'g'),
                  `
                    ${variableObject.round.date.day}.
                    ${variableObject.round.date.month}.
                    ${variableObject.round.date.year}
                  `)
          .replace(new RegExp(/(?<!\\)%YYYY%/, 'g'),
                  variableObject.round.date.year)
          .replace(new RegExp(/(?<!\\)%MM%/, 'g'),
                  variableObject.round.date.month)
          .replace(new RegExp(/(?<!\\)%DD%/, 'g'),
                  variableObject.round.date.day)
          .replace(new RegExp(/(?<!\\)%ZEIT%/, 'g'),
                  `
                    ${variableObject.round.time.hours}:
                    ${variableObject.round.time.minutes}:
                    ${variableObject.round.time.seconds}.
                    ${variableObject.round.time.millionthSeconds}
                  `)
          .replace(new RegExp(/(?<!\\)%hh%/, 'g'),
                  variableObject.round.time.hours)
          .replace(new RegExp(/(?<!\\)%mm%/, 'g'),
                  variableObject.round.time.minutes)
          .replace(new RegExp(/(?<!\\)%ss%/, 'g'),
                  variableObject.round.time.seconds)
          .replace(new RegExp(/(?<!\\)%ffffff%/, 'g'),
                  variableObject.round.millionthSeconds);
  }
  return value;
}

//  set frames and return URL to download the updated file as callback
function setFrames(buffer, frames, callback){
  const writer = new ID3Writer(buffer);
  for(frame of frames){
    writer.setFrame(frame.name, frame.value);
  }
  writer.addTag();
  callback(writer.getURL());
}