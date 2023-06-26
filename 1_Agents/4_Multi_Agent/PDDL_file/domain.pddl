;; domain file: domain-deliveroo.pddl
(define (domain default)

    (:requirements
        :strips)

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
)