import fs from "fs";

import { json } from "stream/consumers";

import * as _ from "lodash";

//! /////////////////////////////////////////

//! /////////////////////////////////////////
//********* */
//! /////////////////////////////////////////

//! NEEDS TO BE COMPLETED
export let venueNameToVenueMnemonic = {
  //! "CASINO":"",
  //! "NOWRA":"",
  //! "RICHMOND-STRAIGHT":"",
  //! "SANDOWN-PARK":"",
  //! "WARRNAMBOOL":"",
  //! "MOUNT-GAMBIER":"",
  //* "":"",
  // VIC
  "THE-MEADOWS": "MEA",
  WARRAGUL: "WRG",
  BALLARAT: "BAL",
  GEELONG: "GEL",
  SALE: "SLE", //??????
  //! "BENDIGO":"",
  HEALESVILLE: "HSV",
  SHEPPARTON: "SHE",
  // WA
  MANDURAH: "MRD",
  CANNINGTON: "CNP",
  // SA
  // NSW
  TAREE: "TRE",
  "THE-GARDENS": "GAR",
  "WENTWORTH-PARK": "WWP",
  GUNNEDAH: "GDH",
  // QLD
  "Q1-LAKESIDE": "QLE",
  // NT
  // TAS
  HOBART: "HOB",
  // NZ
  ADDINGTON: "ADD",
  //! "MANAWATU":"",
  MANUKAU: "MAA",
};

/**
 * url builder for json data to be returned from tab, feed an object as the param, will destructure, use the following properties
 *
 * @param {{ date: string; raceType: string; venueMnemonic: string; raceNumber: string; jurisdiction: string; }}
 * @param {string} date yyyy-mm-dd i.e. 2026-03-23
 * @param {string} [raceType="G"] "G" for greyhounds, "H" for harness, "R" for horses
 * @param {string} venueMnemonic Such as "ADD", "BAL", "GEL", "MRD", etc
 * @param {string || int} raceNumber 1-12
 * @param {string} jurisdiction "NSW",
 * @returns {string} the url to get the json data from
 */
export function URLBuilder({
  date,
  raceType = "G",
  venueMnemonic,
  raceNumber,
  jurisdiction = "NSW",
}) {
  return `https://api.beta.tab.com.au/v1/tab-info-service/racing/dates/${date}/meetings/${raceType}/
${venueMnemonic}/races/${raceNumber}?returnPromo=true&returnOffers=true&jurisdiction=${jurisdiction}`;
}

/**
 * builds an array of urls for each race at a given venue
 *
 * @param {{ numberOfRaces: number; date: string; raceType: string; venueMnemonic: string; jurisdiction: string; }}
 * @param {number} [numberOfRaces=12] max is generally/pretty much 12
 * @param {*} date yyyy-mm-dd
 * @param {string} [raceType="G"] "G", "H", "R"
 * @param {*} venueMnemonic Such as "ADD", "BAL", "GEL", "MRD", etc
 * @param {string} [jurisdiction="NSW"] generally tends to be NSW but may be something else in some other cases
 */
export function buildVenueURLArray({
  numberOfRaces = 12,
  date,
  raceType = "G",
  venueMnemonic,
  jurisdiction = "NSW",
}) {
  let r = [];

  for (let i = 1; i <= numberOfRaces; i++) {
    r.push(
      URLBuilder({
        date,
        raceType,
        venueMnemonic,
        jurisdiction,
        raceNumber: i,
      }),
    );
  }

  return r;
}

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
 * @param {{ filePath: any; data: any; json?: boolean; }}
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
 * @param {*} filePath
 * @returns {*}
 */
export function readDataFromFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

/**
 * gets the form urls for each runner so as to download the forms as well
 *
 * @param {*} filePathString
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
 * @param {{ filePath: any; destinationFilePath: any; }} 
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
 * @param {*} data json data
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
 * @param {{ filePath: any; venueName: any; venueMnemonic: any; }}
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
 * @param {{ filePath: any; venueName: any; venueMnemonic: any; }}
 * @param {*} filePath filepath to the meeting data file
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
 * @param {{ filePath: any; arrayOfExclusionStrings?: {}; raceType?: string; namesOnly?: boolean; }} param0 
 * @param {*} param0.filePath 
 * @param {{}} [param0.arrayOfExclusionStrings=[]] 
 * @param {string} [param0.raceType="G"] 
 * @param {boolean} [param0.namesOnly=true] 
 * @returns {unknown} 
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
 * @param {*} date yyyy-mm-dd i.e. 2026-04-23
 * @returns {JSON} 
 */
export async function fetchDailyMeetings(date) {
  let data = await fetchURL(`https://api.beta.tab.com.au/v1/tab-info-service/racing/dates/${date}/meetings?jurisdiction=NSW&returnOffers=true&returnPromo=false`);
  return await data;
}

console.log(
  await filterMeetingByExludingJurisdictions({
    filePath: "./test5.json",
    raceType: "G",
  }),
);
