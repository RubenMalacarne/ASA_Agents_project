;; domain file: domain-deliveroo.pddl
(define (domain default)

    (:requirements
        :strips
        :equality)

    (:predicates
        (BOT ?x)
        (CELL ?x)
        (PARCEL ?x)
        (incell ?x ?y)
        (leftneighbour ?x ?y)
        (rightneighbour ?x ?y)
        (upneighbour ?x ?y)
        (downneighbour ?x ?y)
        (free ?x)
        (inbagof ?x ?y)
        (onground ?x)
        (isdelivery ?x)
        (isdelivered ?x)
    )

    (:action left
        :parameters (?bot ?from ?to)
        :precondition (and (BOT ?bot) (CELL ?from) (CELL ?to) (incell ?bot ?from) (free ?to) (leftneighbour ?to ?from))
        :effect (and (free ?from) (not (free ?to)) (incell ?bot ?to) (not (incell ?bot ?from)))
    )
    
    (:action right
        :parameters (?bot ?from ?to)
        :precondition (and (BOT ?bot) (CELL ?from) (CELL ?to) (incell ?bot ?from) (free ?to) (rightneighbour ?to ?from))
        :effect (and (free ?from) (not (free ?to)) (incell ?bot ?to) (not (incell ?bot ?from)))
    )

    (:action up
        :parameters (?bot ?from ?to)
        :precondition (and (BOT ?bot) (CELL ?from) (CELL ?to) (incell ?bot ?from) (free ?to) (upneighbour ?to ?from))
        :effect (and (free ?from) (not (free ?to)) (incell ?bot ?to) (not (incell ?bot ?from)))
    )

    (:action down
        :parameters (?bot ?from ?to)
        :precondition (and (BOT ?bot) (CELL ?from) (CELL ?to) (incell ?bot ?from) (free ?to) (downneighbour ?to ?from))
        :effect (and (free ?from) (not (free ?to)) (incell ?bot ?to) (not (incell ?bot ?from)))
    )

    (:action pick_up
        :parameters (?bot ?parcel ?cell)
        :precondition (and (BOT ?bot) (PARCEl ?parcel) (CELL ?cell) (incell ?bot ?cell) (incell ?parcel ?cell) (onground ?parcel))
        :effect (and (not (incell ?parcel ?cell)) (not (onground ?parcel)) (inbagof ?parcel ?bot))
    )

    (:action deliver
        :parameters (?bot ?parcel ?cell)
        :precondition (and (BOT ?bot) (PARCEl ?parcel) (CELL ?cell) (incell ?bot ?cell) (inbagof ?parcel ?bot) (isdelivery ?cell))
        :effect (and (incell ?parcel ?cell) (isdelivered ?parcel) (not (inbagof ?parcel ?bot)))
    )

    (:action put_down
        :parameters (?bot ?parcel ?cell)
        :precondition (and (BOT ?bot) (PARCEl ?parcel) (CELL ?cell) (incell ?bot ?cell) (inbagof ?parcel ?bot))
        :effect (and (incell ?parcel ?cell) (onground ?parcel) (not (inbagof ?parcel ?bot)))
    )

    (:action left_and_down
        :parameters (?bot1 ?from1 ?to1 ?bot2 ?from2 ?to2)
        :precondition (and (BOT ?bot1) (BOT ?bot2) (CELL ?from1) (CELL ?from2) (CELL ?to1) (CELL ?to2) 
            (incell ?bot1 ?from1) (free ?to1) (leftneighbour ?to1 ?from1)
            (incell ?bot2 ?from2) (free ?to2) (downneighbour ?to2 ?from2)
            (not (= ?bot1 ?bot2)) (not (= ?to1 ?to2)))
        :effect (and (free ?from1) (not (free ?to1)) (incell ?bot1 ?to1) (not (incell ?bot1 ?from1))
            (free ?from2) (not (free ?to2)) (incell ?bot2 ?to2) (not (incell ?bot2 ?from2)))
    )

    (:action left_and_right
        :parameters (?bot1 ?from1 ?to1 ?bot2 ?from2 ?to2)
        :precondition (and (BOT ?bot1) (BOT ?bot2) (CELL ?from1) (CELL ?from2) (CELL ?to1) (CELL ?to2) 
            (incell ?bot1 ?from1) (free ?to1) (leftneighbour ?to1 ?from1)
            (incell ?bot2 ?from2) (free ?to2) (rightneighbour ?to2 ?from2)
            (not (= ?bot1 ?bot2)) (not (= ?to1 ?to2)))
        :effect (and (free ?from1) (not (free ?to1)) (incell ?bot1 ?to1) (not (incell ?bot1 ?from1))
            (free ?from2) (not (free ?to2)) (incell ?bot2 ?to2) (not (incell ?bot2 ?from2)))
    )

    (:action left_and_left
        :parameters (?bot1 ?from1 ?to1 ?bot2 ?from2 ?to2)
        :precondition (and (BOT ?bot1) (BOT ?bot2) (CELL ?from1) (CELL ?from2) (CELL ?to1) (CELL ?to2) 
            (incell ?bot1 ?from1) (free ?to1) (leftneighbour ?to1 ?from1)
            (incell ?bot2 ?from2) (free ?to2) (leftneighbour ?to2 ?from2)
            (not (= ?bot1 ?bot2)) (not (= ?to1 ?to2)))
        :effect (and (free ?from1) (not (free ?to1)) (incell ?bot1 ?to1) (not (incell ?bot1 ?from1))
            (free ?from2) (not (free ?to2)) (incell ?bot2 ?to2) (not (incell ?bot2 ?from2)))
    )

    (:action left_and_up
        :parameters (?bot1 ?from1 ?to1 ?bot2 ?from2 ?to2)
        :precondition (and (BOT ?bot1) (BOT ?bot2) (CELL ?from1) (CELL ?from2) (CELL ?to1) (CELL ?to2) 
            (incell ?bot1 ?from1) (free ?to1) (leftneighbour ?to1 ?from1)
            (incell ?bot2 ?from2) (free ?to2) (upneighbour ?to2 ?from2)
            (not (= ?bot1 ?bot2)) (not (= ?to1 ?to2)))
        :effect (and (free ?from1) (not (free ?to1)) (incell ?bot1 ?to1) (not (incell ?bot1 ?from1))
            (free ?from2) (not (free ?to2)) (incell ?bot2 ?to2) (not (incell ?bot2 ?from2)))
    )

    (:action right_and_down
        :parameters (?bot1 ?from1 ?to1 ?bot2 ?from2 ?to2)
        :precondition (and (BOT ?bot1) (BOT ?bot2) (CELL ?from1) (CELL ?from2) (CELL ?to1) (CELL ?to2) 
            (incell ?bot1 ?from1) (free ?to1) (rightneighbour ?to1 ?from1)
            (incell ?bot2 ?from2) (free ?to2) (downneighbour ?to2 ?from2)
            (not (= ?bot1 ?bot2)) (not (= ?to1 ?to2)))
        :effect (and (free ?from1) (not (free ?to1)) (incell ?bot1 ?to1) (not (incell ?bot1 ?from1))
            (free ?from2) (not (free ?to2)) (incell ?bot2 ?to2) (not (incell ?bot2 ?from2)))
    )

    (:action right_and_up
        :parameters (?bot1 ?from1 ?to1 ?bot2 ?from2 ?to2)
        :precondition (and (BOT ?bot1) (BOT ?bot2) (CELL ?from1) (CELL ?from2) (CELL ?to1) (CELL ?to2) 
            (incell ?bot1 ?from1) (free ?to1) (rightneighbour ?to1 ?from1)
            (incell ?bot2 ?from2) (free ?to2) (upneighbour ?to2 ?from2)
            (not (= ?bot1 ?bot2)) (not (= ?to1 ?to2)))
        :effect (and (free ?from1) (not (free ?to1)) (incell ?bot1 ?to1) (not (incell ?bot1 ?from1))
            (free ?from2) (not (free ?to2)) (incell ?bot2 ?to2) (not (incell ?bot2 ?from2)))
    )

    (:action right_and_right
        :parameters (?bot1 ?from1 ?to1 ?bot2 ?from2 ?to2)
        :precondition (and (BOT ?bot1) (BOT ?bot2) (CELL ?from1) (CELL ?from2) (CELL ?to1) (CELL ?to2) 
            (incell ?bot1 ?from1) (free ?to1) (rightneighbour ?to1 ?from1)
            (incell ?bot2 ?from2) (free ?to2) (rightneighbour ?to2 ?from2)
            (not (= ?bot1 ?bot2)) (not (= ?to1 ?to2)))
        :effect (and (free ?from1) (not (free ?to1)) (incell ?bot1 ?to1) (not (incell ?bot1 ?from1))
            (free ?from2) (not (free ?to2)) (incell ?bot2 ?to2) (not (incell ?bot2 ?from2)))
    )

    (:action up_and_up
        :parameters (?bot1 ?from1 ?to1 ?bot2 ?from2 ?to2)
        :precondition (and (BOT ?bot1) (BOT ?bot2) (CELL ?from1) (CELL ?from2) (CELL ?to1) (CELL ?to2) 
            (incell ?bot1 ?from1) (free ?to1) (upneighbour ?to1 ?from1)
            (incell ?bot2 ?from2) (free ?to2) (upneighbour ?to2 ?from2)
            (not (= ?bot1 ?bot2)) (not (= ?to1 ?to2)))
        :effect (and (free ?from1) (not (free ?to1)) (incell ?bot1 ?to1) (not (incell ?bot1 ?from1))
            (free ?from2) (not (free ?to2)) (incell ?bot2 ?to2) (not (incell ?bot2 ?from2)))
    )

    (:action up_and_down
        :parameters (?bot1 ?from1 ?to1 ?bot2 ?from2 ?to2)
        :precondition (and (BOT ?bot1) (BOT ?bot2) (CELL ?from1) (CELL ?from2) (CELL ?to1) (CELL ?to2) 
            (incell ?bot1 ?from1) (free ?to1) (upneighbour ?to1 ?from1)
            (incell ?bot2 ?from2) (free ?to2) (downneighbour ?to2 ?from2)
            (not (= ?bot1 ?bot2)) (not (= ?to1 ?to2)))
        :effect (and (free ?from1) (not (free ?to1)) (incell ?bot1 ?to1) (not (incell ?bot1 ?from1))
            (free ?from2) (not (free ?to2)) (incell ?bot2 ?to2) (not (incell ?bot2 ?from2)))
    )

    (:action down_and_down
        :parameters (?bot1 ?from1 ?to1 ?bot2 ?from2 ?to2)
        :precondition (and (BOT ?bot1) (BOT ?bot2) (CELL ?from1) (CELL ?from2) (CELL ?to1) (CELL ?to2) 
            (incell ?bot1 ?from1) (free ?to1) (downneighbour ?to1 ?from1)
            (incell ?bot2 ?from2) (free ?to2) (downneighbour ?to2 ?from2)
            (not (= ?bot1 ?bot2)) (not (= ?to1 ?to2)))
        :effect (and (free ?from1) (not (free ?to1)) (incell ?bot1 ?to1) (not (incell ?bot1 ?from1))
            (free ?from2) (not (free ?to2)) (incell ?bot2 ?to2) (not (incell ?bot2 ?from2)))
    )
)