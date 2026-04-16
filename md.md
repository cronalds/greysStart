# notes

- features
  - domains:
    - straight vs general track:
      - min time for each, historically, over past x runs
      - max time for each, historically, over past x runs
      - average time for each, historically, over past x runs
      - average place for each, historically, over past x runs
      - average position in run for each, historically, over past x runs
    - distance performance:
      - min time, historically, over past x runs
      - max time, historically, over past x runs
      - average time, historically, over past x runs
      - average place, historically, over past x runs
      - average position in run, historically, over past x runs
    - venue performance:
      - min time, historically, over past x runs
      - max time, historically, over past x runs
      - average time, historically, over past x runs
      - average place, historically, over past x runs
      - average position in run, historically, over past x runs
    - time of day performance:
      - min time
      - max time
      - average time
      - average place
      - average position in run
    - weather performance:
      - min time
      - max time
      - average time
      - average place
      - average position in run
    - grade performance:
      - min time, historically, over past x runs
      - max time, historically, over past x runs
      - average time, historically, over past x runs
      - average place, historically, over past x runs
      - average position in run, historically, over past x runs
    - trainer stats:
      - average placing
      - average winning
    - lineage stats:
      - average time
      - average place
      - average position in run
    - dog stats:
      - min time per distance, historically, over past x runs
      - max time per distance, historically, over past x runs
      - average time per distance, historically, over past x runs
      - average place per distance, historically, over past x runs
      - average position in run per distance, historically, over past x runs
      - average early position first and second split
      - box bias:
        - inside bias
        - centre bias
        - outside bias
        - box repeat performance stability
      - box# to lead conversion rate
      - fieldRankEfficiency: finishingPosition/runnerCount
      - bend efficiency score: position change between first and second split
      - straight line speed dominance score: improvement between last position and finishing position
      - small vs full field performance
      - distance efficiency delta: performance drop off when outside preferred distance
      - track speed suitability: performance relative to track specific average times
      - interference recovery score
      - rail pressure tolerance: boxed inside vs crowded rail; pressure = sum(earlySpeed of adjacent boxes)
      - momentum carry index: correlation between mid race position and finishing position
      - win efficiency under pressure: win in races where dog is not early leader
      - Clean Run Dependency Score: measures interference sensitivity; if a dog starts well sometimes and finishes badly in an inconsistent fashion => likely sensitive; variance(finishPosition - earlyPosition); small change = clear runners, large swings = volatile
      - Race Shape Adaptability: leaderDominated(earlyPositionOfWinner == finishPositionOfWinner); swooper(earlyPositionOfWinner > 2); tells you whether front-run dependant, adaptable, or late runners.
      - disagreement signal: skyRatingRank - earlySpeedRank

[BOX] → determines initial position
   ↓
[EARLY SPEED] → determines first split
   ↓
[TRACK + PRESSURE] → determines position changes
   ↓
[FINISH STRENGTH] → determines final result

-

Outcome =
  f(
    box_position,
    early_speed,
    leader_dominance,
    pressure,
    finish_strength
  )

-----------------------------------------
-----------------------------------------
-----------------------------------------

- ok now i need to start merging the data together appropriately
  - ill get the meeting data for each venue and append/merge data into that; maybe sqlite instead of json, ill think about it a little bit more

- meetings // g/h/r meetings file of date
  - meetingName
  - location
  - meetingDate
  - weatherCondition
  - trackCondition
  - venueMnemonic
  - races // foreach
    - raceNumber
    - raceClassConditions
    - raceStartTime
    - raceStatus
    - raceDistance
    - scratchings
    - // results will be in race info where placings will be stored, can derive results from there

- form data // foreach race at each venue of g/h/r meetings
  - form
    - runnerNumber //
    - runnerName
    - sire
    - dam
    - sex
    - dateOfBirth
    - colour
    - formComment
    - bestTime
    - daysSinceLastRun // later will derive
    - handicapWeight // h/r
    - runsSinceLastSpell
    - trainerName // trainerID
    - runnerStarts.previousStarts // everything else is boxX, track, distance, trackDistance, firstUp, secondUp, overall, etc, and aggregated
      - startDate
      - raceNumber
      - finishingPosition // this is where i can get the finishing position for places 5+
      - numberOfStarters
      - draw // h/r
      - margin
      - venueAbbreviation // {venueMnemonic}{raceType}
      - distance
      - class
      - weight // will probably get this from extended form/moreForm
      - startingPosition
      - winnerOrSecond // runnerID
      - positionsInRun // firstSplit-secondSplit-sometimesThirdSplitDependsOnDistance
      - time

- extended form/moreForm
  - form
    - data
      - raceDistance
      - trackDirection
      - meeting.
        - weatherCondition
        - trackCondition
      - runners // array of objects
        - runnerName // runnerID
        - runnerNumber
        - vacantBox
        - trainerFullName // trainerID
        - barrierNumber // h/r/g box# for g
        - riderDriverName // h/r
        - handicapWeight, harnessHandicap, blinkers, tcdwIndicators, emergency, penalty // h/r
        - dfsFormRating
        - techFormRating // h/r???
        - totalRatingPoints
        - earlySpeedRating
        - earlySpeedRatingBand
      - raceComments // stringified json
      - ratings // \[{}\]
        - ratingType
        - ratingRunnerNumbers // []

- results:
  - data
    - raceStartTime
    - raceStatus
    - results = [[int],[int],[int],[int]]
    - scratchings
      - runnerName
      - runnerNumber
      - trainerName
      - barrierNumber
    - runners
      - runnerName
      - runnerNumber
      - finishingPosition // 1-4 || 0
      - trainerName
    - raceClassConditions

-----------------------------------------
-----------------------------------------
-----------------------------------------

- for draw places ill rely on having more than 1 dog placing for x place and have a drawX column either 0-1

-----------------------------------------
-----------------------------------------
-----------------------------------------

- foreach key in xResults in racePathsGrouped.json will be the keys for greys/harness/horses and their extendedForms as well to group; results are a day behind the rest, ill get the results/form/extended form for each race at each venue and ill get scratchings and replacement runners from the resultings, and the rest of the info from race form and extendedForm; ill just group each into objects with the paths for {race, extendedForm, results} and that will get the paths bundled for proper processing where ill have to create an empty object and fill with pertinent info from each json object(listed above) and add transactions to sqliteDB where data will be appropriately consolidated and itll be much easier to handle/aggregate/etc

- putting in appropriate error output to json and everything else that needs to be done properly. // either winston or bespoke

- get each key in xResults(greysResults first, maybe harness and horses later)
- those will be the keys for greys and greysExtendedForm as well to get the paths from
- get each key inside there x.y for venues
- should be as easy as ensuring count of each venue === each other in race, extended, result and then pairing {race[i][j], extendedForm[i][j], result[i][j]} to get the groupings before processing into a single json object and then adding to sqlite for consolidated data; will think this over more once i have the tables and their schemas written
