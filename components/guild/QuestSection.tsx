"use client";

import { useState } from "react";

import QuestHeader from "./QuestHeader";

import QuestBoard from "./QuestBoard";

export default function QuestSection() {

  const [
    selectedFilter,
    setSelectedFilter,
  ] = useState("ALL");

  const [searchQuery, setSearchQuery] =
    useState("");

  return (
    <>
      <QuestHeader
        selectedFilter={
          selectedFilter
        }
        setSelectedFilter={
          setSelectedFilter
        }
        searchQuery={searchQuery}
        setSearchQuery={
          setSearchQuery
        }
      />

      <QuestBoard
        selectedFilter={
          selectedFilter
        }
        searchQuery={searchQuery}
      />
    </>
  );
}
