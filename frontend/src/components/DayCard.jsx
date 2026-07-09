import React from "react";
import { Clock3 } from "lucide-react";

function DayCard({ day, index }) {
  return (
    <article className="day-card">
      <div className="card-topline">
        <span>Day {day.day}</span>
        <Clock3 size={17} />
      </div>
      <h3>{day.title}</h3>
      <div className="timeline">
        <p>
          <strong>Morning</strong>
          {day.morning}
        </p>
        <p>
          <strong>Afternoon</strong>
          {day.afternoon}
        </p>
        <p>
          <strong>Evening</strong>
          {day.evening}
        </p>
      </div>
    </article>
  );
}

export default DayCard;
