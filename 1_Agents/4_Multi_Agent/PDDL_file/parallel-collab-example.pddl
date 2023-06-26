(define (problem deliveroo)
    (:domain default)   
    (:objects 
        x0y3 x1y3      x3y3
        x0y2 x1y2      x3y2
                       x3y1
        x0y0 x1y0 x2y0 x3y0
        bot1 bot2
        parcel)
    (:init
        (CELL x0y0)
        (CELL x0y2)
        (CELL x0y3)
        (CELL x1y0)
        (CELL x1y2)
        (CELL x1y3)
        (CELL x2y0)
        (CELL x3y0)
        (CELL x3y1)
        (CELL x3y2)
        (CELL x3y3)
        (BOT bot1)
        (BOT bot2)
        (PARCEL parcel)

        (leftneighbour x0y0 x1y0) 
        (leftneighbour x1y0 x2y0) (rightneighbour x1y0 x0y0)
        (leftneighbour x2y0 x3y0) (rightneighbour x2y0 x1y0)
        (rightneighbour x3y0 x2y0) (downneighbour x3y0 x3y1)

        (downneighbour x3y1 x3y2) (upneighbour x3y1 x3y0)
        
        (downneighbour x0y2 x0y3) (leftneighbour x0y2 x1y2) 
        (downneighbour x1y2 x1y3) (rightneighbour x1y2 x0y2)
        (downneighbour x3y2 x3y3) (upneighbour x3y2 x3y1)   

        (leftneighbour x0y3 x1y3) (upneighbour x0y3 x0y2)
        (rightneighbour x1y3 x0y3) (upneighbour x1y3 x1y2)
        
        (upneighbour x3y3 x3y2)

        (incell bot1 x3y0)
        (incell bot2 x3y3)
        (onground parcel)
        (isdelivery x3y3)
        (incell parcel x0y0)
        
        (free x0y0)
        (free x0y2)
        (free x0y3)
        (free x1y0)
        (free x1y2)
        (free x1y3)
        (free x2y0)
        (free x3y1)
        (free x3y2)
        
        )
    (:goal (and (isdelivered parcel)))
)