# basic gist

- start by downloading meetings
  - i can split into 3 separate json files by raceType as well as further splitting by venue

- from there download each race from each venue
  - store these in separate json files, maybe in a monolithic file, but probably better to store per race for the races than per venue, ill figure that out later

- then each form for each race
  - these come as an array of runners already i think

- then at the end of each racing day ill download the meetings again which should contain results, which ill merge/store correctly, will look at that soon; cant seem to get the winning times but that will probably show up on each individual dogs form next race etc

- this will all be done in a monolithic procedural function that will straight up get called and handle everything, right now its split up over various functions and all that shit but i think id prefer this as a single large function that handles everything in order of procedure. ill figure that out too but atm thats what im thinking itll be.

- naming conventions:
  - meetings: {date i.e. 2026-04-04/yyyy-mm-dd}-{VENUENAME}-MEETING
  - meetingsResulted: {date i.e. 2026-04-04/yyyy-mm-dd}-{VENUENAME}-RESULTEDMEET
  - race: {date i.e. 2026-04-04/yyyy-mm-dd}-{VENUENAME}-{VENUENAME}-RACE-{#}
  - form: {date i.e. 2026-04-04/yyyy-mm-dd}-{VENUENAME}-{VENUENAME}-RACE-{#}-RUNNERFORM

- infrastructure of data storage:
  - "./data"
  - += "/{raceType}" // G/H/R
  - += "/{venueName}" // TAREE/GUNNEDAH/WARRNAMBOOL/etc
  - += "/{date}/"

##

- fetchMeetings -> splitByRaceType -> fetchRaces -> fetchRunnerForms

- later i can consolidate runnerData into a single json for each runner then foreign key them to races/trainers/etc
