import fs from "fs";

import { json } from "stream/consumers";

// import * as _ from "lodash";

/**
 * fetch the json from the url
 *
 * @async
 * @param {string} url the url string from the builder
 * @returns {json}
 */
export async function fetchURL(url) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - ${res.statusText}`);
  }

  let awaitedResponse = await res.json(); // or .txt, depends on all that kinda stuff, but .json here
  let properObject = { data: awaitedResponse };

  return properObject;
}

/**
 * save data to a filepath
 *
 * @param {{ filePath: string; data: string; json: boolean; }}
 * @param {*} filePath filepath to save to i.e. "./test.json"
 * @param {*} data data to save
 * @param {boolean} [json=true] if true will stringify, default true
 */
export function saveDataToFile({ filePath, data, json = true }) {
  if (json === true) {
    fs.writeFileSync(filePath, JSON.stringify(data));
  } else {
    fs.writeFileSync(filePath, data);
  }
}

/**
 * read data from path such as arrays or objects, etc, back to js types
 *
 * @export
 * @param {string} filePath
 * @returns {{}}
 */
export function readDataFromFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

/**
 * gets the form urls for each runner so as to download the forms as well
 *
 * @param {string} filePathString
 * @returns {[]}
 */
export function getFormURLsFromJsonFile(filePathString) {
  let dataFile = fs.readFileSync(filePathString, "utf-8");
  let data = JSON.parse(dataFile);
  let runnersArray = data.data.runners;
  let runnersFormURLsArray = [];

  for (let i = 0; i < runnersArray.length; i++) {
    let scratchedPotential = i + 1;
    try {
      let getting = runnersArray[i]._links.form;
      runnersFormURLsArray.push(getting);
    } catch {
      console.log(
        "unable for runner " + scratchedPotential + ", must be scratched",
      );
    }
  }
  return runnersFormURLsArray;
}

/**
 * gets the formURL of the runners in an array and saves it to a file.
 *
 * @export
 * @param {{ filePath: string; destinationFilePath: string; }}
 * @param {string} filePath
 * @param {string} destinationFilePath
 */
export function getFormURLsFromJsonFileAndSaveToFile({
  filePath,
  destinationFilePath,
}) {
  let x = getFormURLsFromJsonFile(filePath);
  saveDataToFile({ filePath: destinationFilePath, data: x });
}

/**
 * gets the form urls from json
 *
 * @export
 * @async
 * @param {{}} data json data
 * @returns {[string]}
 */
export async function getFormURLs(data) {
  let runnersArray = data.data.runners;
  let runnersFormURLsArray = [];

  for (let i = 0; i < runnersArray.length; i++) {
    let scratchedPotential = i + 1;
    try {
      let getting = runnersArray[i]["_links"]["form"];
      runnersFormURLsArray.push(getting);
    } catch {
      console.log(
        "unable for runner " + scratchedPotential + ", must be scratched",
      );
    }
  }
  return runnersFormURLsArray;
}

/**
 * fetchs the form data from a url to racedata
 *
 * @async
 * @param {{ url: string; filePath: string; }}
 * @param {string} url
 * @param {string} filePath
 * @returns {{}}
 */
async function fetchFormDataOfRunningDogs({ url, filePath }) {
  const raceData = await fetchURL(url);
  console.log(raceData);
  let formDataURLS = await getFormURLs(raceData);
  let fetchedFormData = [];

  for (let i = 0; i < formDataURLS.length; i++) {
    const data = await fetchURL(formDataURLS[i]);
    fetchedFormData.push(data);
    console.log(data);
  }
  saveDataToFile({ filePath: filePath, data: fetchedFormData });
}

/**
 * filter json meeting data by either the meetingName or venueMnemonic
 *
 * @export
 * @param {{ filePath: string; venueName: string; venueMnemonic: string; }}
 * @param {string} filePath i.e. "./test.json"
 * @param {string} venueName "SALE", "MANDURAH", "THE-GARDENS", etc
 * @param {string} venueMnemonic "GDH", "HEA", "TRE", etc
 * @returns {{}}
 */
export function filterMeetingByVenueNameOrMnemonic({
  filePath,
  venueName,
  venueMnemonic,
}) {
  let data = readDataFromFile(filePath);
  if (!venueMnemonic && !venueName) {
    return [];
  }
  if (venueName) {
    return data?.data?.meetings.filter(
      (meeting) => meeting.meetingName === venueName,
    );
  } else if (venueMnemonic) {
    return data?.data?.meetings.filter(
      (meeting) => meeting.venueMnemonic === venueMnemonic,
    );
  }
}

/**
 * fetchs the json of all races in a meeting from the meeting data file
 *
 * @export
 * @async
 * @param {{ filePath: string; venueName: string; venueMnemonic: string; }}
 * @param {string} filePath filepath to the meeting data file
 * @param {string} venueName "SALE", "MANDURAH", "THE-GARDENS", etc
 * @param {string} venueMnemonic "GDH", "HEA", "TRE", etc
 * @returns {{}}
 */
export async function fetchRacesOfAMeetingByVenueNameOrMnemonic({
  filePath,
  venueName,
  venueMnemonic,
}) {
  if (!venueName && !venueMnemonic) {
    return "NO VENUE NAME OR MNEMONIC MATCH";
  }
  if (venueMnemonic) {
    let data = filterMeetingByVenueNameOrMnemonic({
      filePath: filePath,
      venueMnemonic: venueMnemonic,
    })[0]; // gets first indices of array before going into object such as below; its the only indices, idk why they didnt just make it a string, probably an accident that doesnt need fixing
    console.log(data);
    return await fetchURL(data._links.races);
  } else if (venueName) {
    let data = filterMeetingByVenueNameOrMnemonic({
      filePath: filePath,
      venueName: venueName,
    })[0]; // gets first indices of array before going into object such as below; its the only indices, idk why they didnt just make it a string, probably an accident that doesnt need fixing
    console.log(data);
    return await fetchURL(data._links.races);
  }
}

/**
 * returns all meetings exluding those in the arrayOfExclusionStrings i.e. ["NSW","SA","NZL"] etc
 *
 * @export
 * @async
 * @param {{ filePath: string; arrayOfExclusionStrings?: [string]; raceType?: string; namesOnly?: boolean; }}
 * @param {string} filePath
 * @param {{}} [arrayOfExclusionStrings=[]] i.e. ["NSW","SA","NZL"] etc
 * @param {string} [raceType="G"] "G", "H", "R"
 * @param {boolean} [namesOnly=true] true by default, false for array of objects with all data
 * @returns {*} stringArray or object
 */
export async function filterMeetingByExludingJurisdictions({
  filePath,
  arrayOfExclusionStrings = [],
  raceType = "G",
  namesOnly = true,
}) {
  let meetings = [];
  let returnValues = [];
  let data = await readDataFromFile(filePath);
  let meetAddr = data.data.meetings;

  for (let i = 0; i < meetAddr.length; i++) {
    if (meetAddr[i].raceType === raceType) {
      meetings.push(meetAddr[i]);
    }
  }

  for (let i = 0; i < meetings.length; i++) {
    let excludeByLocation = arrayOfExclusionStrings;

    if (!excludeByLocation.includes(meetings[i].location))
      if (namesOnly) {
        returnValues.push(meetings[i].meetingName);
      } else {
        returnValues.push(meetings[i]);
      }
  }
  return await returnValues;
}

/**
 * get the json file containing the days meetings
 *
 * @export
 * @async
 * @param {string} date yyyy-mm-dd i.e. 2026-04-23
 * @returns {JSON}
 */
export async function fetchDailyMeetings(date) {
  let data = await fetchURL(
    `https://api.beta.tab.com.au/v1/tab-info-service/racing/dates/${date}/meetings?jurisdiction=NSW&returnOffers=true&returnPromo=false`,
  );
  return await data;
}

/**
 * fetch and save the meetings of the input date
 *
 * @export
 * @async
 * @param {{ date: string; filePath: string; }}
 * @param {string} date
 * @param {string} filePath
 */
export async function fetchAndSaveDailyMeetings({ date, filePath }) {
  let data = await fetchDailyMeetings(date);
  saveDataToFile({ filePath: filePath, data: data });
}

/**
 * returns an object with strings built for meeting, race, form, and resultedMeeting file names, ensures consistency
 *
 * @export
 * @param {{ date: string; venueName: string; raceNumber: int; fileExtension:string;}} 
 * @param {string} date meeting/race date
 * @param {string} venueName 
 * @param {number} raceNumber 
 * @param {string="json"} fileExtension "json" by default
 * @returns {{ meetings: string; races: string; form: string; resultedMeetings: string;}} 
 * @example 
 * // will return something like:
 * 
 * {
    meetings:`2026-04-04-TAREE-meetings.json`,
    race: `2026-04-04-TAREE-race-1.json`,
    form:`2026-04-04-TAREE-race-1-form.json`,
    resultedMeetings:`2026-04-04-TAREE-meetings-RESULTED.json`,
  }

  // to be accessed like:

  let x = fileNameBuilderObject({date:"2026-04-04", venueName:"TAREE", raceNumber:1}); // in a for loop can increment raceNumber param as i and will coerce int to string
  let y = x.race // === `2026-04-04-TAREE-race-1.json`
 */
export function fileNameBuilderObject({
  date,
  venueName,
  raceNumber = 1,
  fileExtension = "json",
}) {
  return {
    meetings: `${date}-${venueName}-meetings.${fileExtension}`,
    race: `${date}-${venueName}-race-${raceNumber}.${fileExtension}`,
    form: `${date}-${venueName}-race-${raceNumber}-form.${fileExtension}`,
    resultedMeetings: `${date}-${venueName}-meetings-RESULTED.${fileExtension}`,
  };
}

/**
 * returns an object with strings built for meeting, race, form, and resultedMeeting path names including filenames built, ensures consistency
 *
 * @export
 * @param {{ pathStart?: string; raceType?: string; venueName: string; date: string; fileNameObject?: {}; }}
 * @param {string} [pathStart="./data"] this is the start of the path strings, currently "./data", but made a param in case i need to "../../etc"
 * @param {{}} [fileNameObject={}] returned fileNameObject from the function
 * @param {string} [raceType="G"] G/R/H
 * @param {string} venueName
 * @param {string} date yyyy-mm-dd
 * @returns {{ meetingsPath: string; racePath: string; formPath: string; resultedMeetingsPath: string; }}
 * @example
 * let x = filenameBuilderObject({date:date:"2026-04-05", venueName:"MANDURAH", raceNumber:1, fileExtension:"json"});
 *
 * let y = pathBuilderObject({pathStart:"./data",raceType:"G",venueName:"MANDURAH", date:"2026-04-05", fileNameObject:x});
 *
 * // returns something like:
 *
 * {
 *    meetingsPath: "./data/G/MANDURAH/2026-04-05/2026-04-05-MANDURAH-meetings.json",
 *    racePath: "./data/G/MANDURAH/2026-04-05/2026-04-05-MANDURAH-race-1.json",
 *    formPath: "./data/G/MANDURAH/2026-04-05/2026-04-05-MANDURAH-race-1-form.json",
 *    resultedMeetingsPath: "./data/G/MANDURAH/2026-04-05/2026-04-05-MANDURAH-meetings-RESULTED.json"
 * }
 */
export function pathBuilderObject({
  pathStart = "./data",
  raceType = "G",
  venueName,
  date,
  fileNameObject = {},
}) {
  let initialPathStart = `${pathStart}/${raceType}/${venueName}/${date}`;
  return {
    meetingsPath: `${initialPathStart}/${fileNameObject.meetings}`,
    racePath: `${initialPathStart}/${fileNameObject.race}`,
    formPath: `${initialPathStart}/${fileNameObject.form}`,
    resultedMeetingsPath: `${initialPathStart}/${fileNameObject.resultedMeetings}`,
  };
}

/**
 * returns the object with path and filenames, essentially facading filenameBuilderObject and pathBuilderObject to create paths to files for saving/loading json data and probably csv data later when i start breaking this data down and feature engineering for the model.
 *
 * @export
 * @param {{ date: any; venueName: any; raceNumber?: number; fileExtension?: string; pathStart?: string; raceType?: string; }}
 * @param {string} date yyyy-mm-dd
 * @param {string} venueName
 * @param {number} [raceNumber=1]
 * @param {string} [fileExtension="json"] "json" by default
 * @param {string} [pathStart="./data"] this is the start of the path strings, currently "./data", but made a param in case i need to "../../etc"
 * @param {string} [raceType="G"] G/H/R
 * @returns {{ meetingsPath: string; racePath: string; formPath: string; resultedMeetingsPath: string; }}
 */
export function pathsWithFilenames({
  date,
  venueName,
  raceNumber = 1,
  fileExtension = "json",
  pathStart = "./data",
  raceType = "G",
}) {
  let x = fileNameBuilderObject({
    date: date,
    venueName: venueName,
    raceNumber: raceNumber,
    fileExtension: fileExtension,
  });

  return pathBuilder({
    pathStart: pathStart,
    raceType: raceType,
    fileNameObject: x,
  });
}

/**
 *
 *console.log(
 *  await filterMeetingByExludingJurisdictions({
 *    filePath: "./test5.json",
 *    raceType: "G",
 *  }),
 *);
 */
