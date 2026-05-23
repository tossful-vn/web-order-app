import type { Metadata } from "next";
import FeedbackForm from "./FeedbackForm.client";
import "../nutrition/styles.css";

export const metadata: Metadata = {
  title: "Tossful — Feedback",
  description: "Help us improve Tossful.",
};

export default function FeedbackPage() {
  return (
    <div className="tossful-calc">
      <div className="app">
        <FeedbackForm />
      </div>
    </div>
  );
}
