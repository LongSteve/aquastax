'use strict';

/**
 * A* pathfinding routines for the Gumblers to climb and
 * navigate the grid. The main findPath method is lifted as is
 * from AquaStax.java, since it was originally only coded with
 * arrays and is almost source compatible with Javascript!
 */

aq.path = aq.path || {};

(function () {

// 'constants' used in the pathfinding

const DIAGONAL_MOVEMENT_COST      = 14;
const DIRECT_MOVEMENT_COST        = 10;

const pfWidth   = aq.config.GRID_WIDTH;          // 14
const pfHeight  = 20;                            // 14 * 20 = 280 nodes to pathfind in.
                                                 // All the arrays below wil take up 280 * 7 = 1960 bytes (approx) which isn't too bad IMHO
// statics
var pfYOffset = 0;
var onClosedList = 0;

// Allocate all the pathfinding structures
var openList, whichList, openX, openY, parentX, parentY, Fcost, Gcost, Hcost;

aq.path.initPathfinding = function () {

   // Allocate all the pathfinding structures
   openList = aq.createArray (pfWidth * pfHeight + 2);       // 1 dimensional array holding ID# of open list items
   whichList = aq.createArray (pfWidth + 1, pfHeight + 1);   // 2 dimensional array used to record
                                                             // whether a cell is on the open list or on the closed list.

   openX = aq.createArray (pfWidth * pfHeight + 2);          // 1d array stores the x location of an item on the open list
   openY = aq.createArray (pfWidth * pfHeight + 2);          // 1d array stores the y location of an item on the open list
   parentX = aq.createArray (pfWidth + 1, pfHeight + 1);     // 2d array to store parent of each cell (x)
   parentY = aq.createArray (pfWidth + 1, pfHeight + 1);     // 2d array to store parent of each cell (y)
   Fcost = aq.createArray (pfWidth * pfHeight + 2);          // 1d array to store F cost of a cell on the open list
   Gcost = aq.createArray (pfWidth + 1, pfHeight + 1);       // 2d array to store G cost for each cell.
   Hcost = aq.createArray (pfWidth * pfHeight + 2);          // 1d array to store H cost of a cell on the open list
};

/**
 * Given starting and ending coordinates, and an solid
 * function, calculate a path between the two points.
 *
 * @param startX 0 indexed grid X position
 * @param startY 0 indexed (from the bottom) grid Y position
 * @param targetX
 * @param targetY
 * @param path array of reference index positions (returned)
 * @param pathAvailable function for a grid cell (return true
 *                 for filled cells and false for empty ones)
 */
aq.path.findPath = function (startX, startY, targetX, targetY, path, pathAvailable) {

   var onOpenList=0, parentXval=0, parentYval=0,
       a=0, b=0, m=0, u=0, v=0, temp=0, numberOfOpenListItems=0,
       addedGCost=0, tempGcost = 0,
       tempx, pathX, pathY, finalX = -1, finalY = -1,
       newOpenListItemID=0;

   var low = (1<<30);

   // If starting location and target are in the same location...
   if (startX === targetX && startY === targetY)
   {
      return;
   }

   // If the target is out of the pfHeight range, we need to pathfind on the nearest location to it
   // that is actually in the range.  This will only occur in the vertical direction
   if (targetY > pfHeight - 1)
   {
      targetY = pfHeight - 1;
   }
   if (targetY < 0)
   {
      targetY = 0;
   }

   //3.Reset some variables that need to be cleared
   if (onClosedList > 1000000)
   {
      for (let x = 0; x < pfWidth;x++)
      {
         for (let y = 0; y < pfHeight;y++) {
            whichList [x][y] = 0;
         }
      }
      onClosedList = 10;
   }
   onClosedList = onClosedList+2; //changing the values of onOpenList and onClosed list is faster than redimming whichList() array
   onOpenList = onClosedList-1;
   Gcost[startX][startY] = 0; //reset starting square's G value to 0

   //4.Add the starting location to the open list of squares to be checked.
   numberOfOpenListItems = 1;
   openList[1] = 1;//assign it as the top (and currently only) item in the open list, which is maintained as a binary heap (explained below)
   openX[1] = startX ; openY[1] = startY;

   //5.Do the following until a path is found or deemed nonexistent.
   do
   {
      //6.If the open list is not empty, take the first cell off of the list.
      // This is the lowest F cost cell on the open list.
      if (numberOfOpenListItems !== 0)
      {

         //7. Pop the first item off the open list.
         parentXval = openX[openList[1]];
         parentYval = openY[openList[1]]; //record cell coordinates of the item
         whichList[parentXval][parentYval] = onClosedList;//add the item to the closed list

         // Open List = Binary Heap: Delete this item from the open list, which
         //  is maintained as a binary heap. For more information on binary heaps, see:
         // http://www.policyalmanac.org/games/binaryHeaps.htm
         numberOfOpenListItems = numberOfOpenListItems - 1;//reduce number of open list items by 1

         // Delete the top item in binary heap and reorder the heap, with the lowest F cost item rising to the top.
         openList[1] = openList[numberOfOpenListItems+1];//move the last item in the heap up to slot #1
         v = 1;

         // Repeat the following until the new item in slot #1 sinks to its proper spot in the heap.
         do
         {
            u = v;
            if ((u<<1)+1 <= numberOfOpenListItems)
            {
               //if both children exist
               //Check if the F cost of the parent is greater than each child.
               //Select the lowest of the two children.
               if (Fcost[openList[u]] >= Fcost[openList[u<<1]])
               {
                  v = u<<1;
               }
               if (Fcost[openList[v]] >= Fcost[openList[(u<<1)+1]])
               {
                  v = (u<<1)+1;
               }
            }
            else
            {
               if ((u<<1) <= numberOfOpenListItems)
               {
                  //if only child #1 exists
                  //Check if the F cost of the parent is greater than child #1
                  if (Fcost[openList[u]] >= Fcost[openList[u<<1]])
                  {
                     v = (u<<1);
                  }

               }
            }

            if (u !== v)
            {
               //if parent's F is > one of its children, swap them
               temp = openList[u];
               openList[u] = openList[v];
               openList[v] = temp;
            }
            else
            {
               break; //otherwise, exit loop
            }

         }
         while (/*!KeyDown(27)*/true);   //reorder the binary heap

         //7.Check the adjacent squares. (Its "children" -- these path children
         // are similar, conceptually, to the binary heap children mentioned
         // above, but don't confuse them. They are different. Path children
         // are portrayed in Demo 1 with grey pointers pointing toward
         // their parents.) Add these adjacent child squares to the open list
         // for later consideration if appropriate (see various if statements
         // below).
         for (a = parentXval-1; a <= parentXval+1; a++)
         {
            for (b = parentYval-1; b <= parentYval+1; b++)
            {
               // Since gumblers do not move in diagonals, we can ignore the 4 corners
               if (b === parentYval || a === parentXval)
               {
                  // If not off the map (do this first to avoid array out-of-bounds errors)
                  if (a !== -1 && b !== -1 && a !== pfWidth && b !== pfHeight)
                  {
                     // If not already on the closed list (items on the closed list have
                     // already been considered and can now be ignored).
                     if (whichList[a][b] !== onClosedList)
                     {
                        // If not a wall/obstacle square.
                        if (pathAvailable(a,b))
                        {
                           // If not already on the open list, add it to the open list.
                           if (whichList[a][b] !== onOpenList)
                           {
                              //Create a new open list item in the binary heap.
                              newOpenListItemID = newOpenListItemID + 1; //each new item has a unique ID #
                              m = numberOfOpenListItems+1;
                              openList[m] = newOpenListItemID;//place the new open list item (actually, its ID#) at the bottom of the heap
                              openX[newOpenListItemID] = a;
                              openY[newOpenListItemID] = b;//record the x and y coordinates of the new item

                              //Figure out its G cost
                              if (Math.abs(a-parentXval) === 1 && Math.abs(b-parentYval) === 1)
                              {
                                 addedGCost = DIAGONAL_MOVEMENT_COST;//cost of going to diagonal squares
                              }
                              else
                              {
                                 addedGCost = DIRECT_MOVEMENT_COST;//cost of going to non-diagonal squares
                              }
                              Gcost[a][b] = Gcost[parentXval][parentYval] + addedGCost;

                              //Figure out its H and F costs and parent
                              //Hcost[openList[m]] = 10*(Math.abs(a - targetX) + Math.abs(b - targetY));

                              // Factoring the *10 into 4 and 6 here favours vertical paths, which is what we want gumblers to do
                              Hcost[openList[m]] = 4*Math.abs(a - targetX) + 4*aq.config.GRID_WIDTH*Math.abs(b - targetY);

                              Fcost[openList[m]] = Gcost[a][b] + Hcost[openList[m]];
                              parentX[a][b] = parentXval ; parentY[a][b] = parentYval;

                              // Whilst running over the walkable positions, we save the one with the lowest H value
                              // In the event that a path in unfindable, ie, the target is unreachable, we will use this
                              // value as the target result of the pathfind
                              if (Hcost[openList[m]] < low)
                              {
                                 low = Hcost[openList[m]];
                                 finalX = a;
                                 finalY = b;
                              }

                              //Move the new open list item to the proper place in the binary heap.
                              //Starting at the bottom, successively compare to parent items,
                              //swapping as needed until the item finds its place in the heap
                              //or bubbles all the way to the top (if it has the lowest F cost).
                              while (m !== 1)
                              {
                                 //While item hasn't bubbled to the top (m=1)
                                 //Check if child's F cost is < parent's F cost. If so, swap them.
                                 if (Fcost[openList[m]] <= Fcost[openList[m>>1]])
                                 {
                                    temp = openList[m>>1];
                                    openList[m>>1] = openList[m];
                                    openList[m] = temp;
                                    m = m>>1;
                                 }
                                 else
                                 {
                                    break;
                                 }
                              }
                              numberOfOpenListItems = numberOfOpenListItems+1;//add one to the number of items in the heap

                              //Change whichList to show that the new item is on the open list.
                              whichList[a][b] = onOpenList;
                           }

                           //8.If adjacent cell is already on the open list, check to see if this
                           // path to that cell from the starting location is a better one.
                           // If so, change the parent of the cell and its G and F costs.
                           else
                           {
                              //If whichList(a,b) = onOpenList

                              //Figure out the G cost of this possible new path
                              if (Math.abs(a-parentXval) === 1 && Math.abs(b-parentYval) === 1)
                              {
                                 addedGCost = DIAGONAL_MOVEMENT_COST;//cost of going to diagonal tiles
                              }
                              else
                              {
                                 addedGCost = DIRECT_MOVEMENT_COST;//cost of going to non-diagonal tiles
                              }
                              tempGcost = Gcost[parentXval][parentYval] + addedGCost;

                              //If this path is shorter (G cost is lower) then change
                              //the parent cell, G cost and F cost.
                              if (tempGcost < Gcost[a][b])
                              {
                                 //if G cost is less,
                                 parentX[a][b] = parentXval; //change the square's parent
                                 parentY[a][b] = parentYval;
                                 Gcost[a][b] = tempGcost;//change the G cost

                                 //Because changing the G cost also changes the F cost, if
                                 //the item is on the open list we need to change the item's
                                 //recorded F cost and its position on the open list to make
                                 //sure that we maintain a properly ordered open list.
                                 for (let x = 1; x <= numberOfOpenListItems; x++)
                                 {
                                    //look for the item in the heap
                                    if (openX[openList[x]] === a && openY[openList[x]] === b)
                                    {
                                       //item found
                                       Fcost[openList[x]] = Gcost[a][b] + Hcost[openList[x]];//change the F cost

                                       //See if changing the F score bubbles the item up from it's current location in the heap
                                       m = x;
                                       while (m !== 1)
                                       {
                                          //While item hasn't bubbled to the top (m=1)
                                          //Check if child is < parent. If so, swap them.
                                          if (Fcost[openList[m]] < Fcost[openList[m>>1]])
                                          {
                                             temp = openList[m>>1];
                                             openList[m>>1] = openList[m];
                                             openList[m] = temp;
                                             m = m>>1;
                                          }
                                          else
                                          {
                                             break;
                                          }
                                       }

                                       break; //exit for x = loop
                                    } //If openX(openList(x)) = a
                                 } //For x = 1 To numberOfOpenListItems
                              }//If tempGcost < Gcost(a,b)
                           }//else If whichList(a,b) = onOpenList
                        }//If not a wall/obstacle square.
                     }//If not already on the closed list
                  }//If not off the map
               }//If ignoring corners
            }//for (a = parentXval-1; a <= parentXval+1; a++){
         }//for (b = parentYval-1; b <= parentYval+1; b++){

      }//if (numberOfOpenListItems != 0)

      //9.If open list is empty then there is no path.
      else
      {
         break;
      }

      //If target is added to open list then path has been found.
      if (whichList[targetX][targetY] === onOpenList)
      {
         break;
      }

   }
   while (true);//Do until path is found or deemed nonexistent

   // If the open list is empty, the target we originally wanted was in fact unreachable
   if (numberOfOpenListItems === 0)
   {
      // What this does is to chose the finalX and finalY as the place the Gumbler actually wants
      // to head to.  However, in this case, we really want the Gumbler to head for the highest
      // location on the path

      targetX = finalX;
      targetY = finalY;
   }

   // a.Working backwards from the target to the starting location by checking
   // each cell's parent, figure out the length of the path.
   u = -1;
   if (targetX !== -1 && targetY !== -1)
   {
      pathX = targetX;
      pathY = targetY;
      do
      {
         //Look up the parent of the current cell.
         tempx = parentX[pathX][pathY];
         pathY = parentY[pathX][pathY];
         pathX = tempx;

         u++;
      }
      while (pathX !== startX || pathY !== startY);

      // Clear out the unused entries at the end of the path array
      for (v = path.length - 1; v > u; v--)
      {
         path[v] = -1;
      }

      // Now enter the path information into the path [] array in the correct order
      pathX = targetX;
      pathY = targetY;
      do
      {
         // Current cell
         let pathRef = pathX + ((pathY + pfYOffset) * aq.config.GRID_WIDTH);

         // Store it in the path, working backwards
         path[u--] = pathRef;

         //Look up the parent of the current cell.
         tempx = parentX[pathX][pathY];
         pathY = parentY[pathX][pathY];
         pathX = tempx;
      }
      while (pathX !== startX || pathY !== startY);

      // If the original target position was unreachable, make sure the path takes us up, and not down
      if (numberOfOpenListItems === 0)
      {
         // Find the highest path reference
         let high_y = startY;
         let high_index = -1;
         for (v = 0; v < path.length; v++)
         {
            if (path[v] !== -1)
            {
               let py = Math.floor (path[v] / aq.config.GRID_WIDTH);
               if (py > high_y)
               {
                  high_y = py;
                  high_index = v;
               }
            }
         }

         // Now discard all the path elements that are beyond the highest point
         for (v = high_index + 1; v < path.length; v++)
         {
            path[v] = -1;
         }
      }
   }
   else
   {
      for (v = path.length - 1; v > -1; v--)
      {
         path[v] = -1;
      }
   }
};

})();

