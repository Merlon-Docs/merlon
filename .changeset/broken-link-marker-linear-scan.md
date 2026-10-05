---
'@bwilliamson/mdcp-core': patch
---

Find broken-link markers in linear time

Link validation looks for a BROKEN LINK marker on each line of compiled output with `lineHasMarker`, and monolith link lint lists the markers on a line with `findMarkers`. Both ran a regex built from the locale's `markerTemplate`, with a lazy `.*?` for each variable but `markerLabel`. On a crafted line that regex tries every choice of where each variable ends, so with the four variables of the en-US template its time grew with about the fourth power of the line's length. A line of 733 characters took 115 ms, and one of 2,878 took 28 s.

A scanner now finds the template's literal parts in order, with no line terminator between two of them, and returns the markers that the regex returned. Its time grows linearly with the line, and the 2,878-character line takes under 1 ms. The link pass of compiled link lint also asked about a line once for each link on it, so a line of 16,000 links with a marker at the end took 257 ms. That pass now asks once per line, and the line takes 12 ms. New cases in the ReDoS budget suite cover crafted marker lines and a marker line with many links.
