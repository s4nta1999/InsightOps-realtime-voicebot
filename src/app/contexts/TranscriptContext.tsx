"use client";

import React, {
  createContext,
  useContext,
  useState,
  FC,
  PropsWithChildren,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { TranscriptItem } from "@/app/types";

type TranscriptContextValue = {
  transcriptItems: TranscriptItem[];
  addTranscriptMessage: (
    itemId: string,
    role: "user" | "assistant",
    text: string,
    isHidden?: boolean,
  ) => void;
  updateTranscriptMessage: (itemId: string, text: string, isDelta: boolean) => void;
  addTranscriptBreadcrumb: (title: string, data?: Record<string, any>) => void;
  toggleTranscriptItemExpand: (itemId: string) => void;
  updateTranscriptItem: (itemId: string, updatedProperties: Partial<TranscriptItem>) => void;
  saveConversation: (sessionId: string) => Promise<boolean>;
  clearTranscript: () => void;
};

const TranscriptContext = createContext<TranscriptContextValue | undefined>(undefined);

export const TranscriptProvider: FC<PropsWithChildren> = ({ children }) => {
  const [transcriptItems, setTranscriptItems] = useState<TranscriptItem[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);

  function newTimestampPretty(): string {
    const now = new Date();
    const time = now.toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const ms = now.getMilliseconds().toString().padStart(3, "0");
    return `${time}.${ms}`;
  }

  const addTranscriptMessage: TranscriptContextValue["addTranscriptMessage"] = (itemId, role, text = "", isHidden = false) => {
    // 세션 시작 시간 기록 (첫 메시지가 추가될 때)
    if (!sessionStartTime && !isHidden) {
      setSessionStartTime(new Date().toISOString());
    }

    setTranscriptItems((prev) => {
      if (prev.some((log) => log.itemId === itemId && log.type === "MESSAGE")) {
        console.warn(`[addTranscriptMessage] skipping; message already exists for itemId=${itemId}, role=${role}, text=${text}`);
        return prev;
      }

      const newItem: TranscriptItem = {
        itemId,
        type: "MESSAGE",
        role,
        title: text,
        expanded: false,
        timestamp: newTimestampPretty(),
        createdAtMs: Date.now(),
        status: "IN_PROGRESS",
        isHidden,
      };

      return [...prev, newItem];
    });
  };

  const updateTranscriptMessage: TranscriptContextValue["updateTranscriptMessage"] = (itemId, newText, append = false) => {
    setTranscriptItems((prev) =>
      prev.map((item) => {
        if (item.itemId === itemId && item.type === "MESSAGE") {
          return {
            ...item,
            title: append ? (item.title ?? "") + newText : newText,
          };
        }
        return item;
      })
    );
  };

  const addTranscriptBreadcrumb: TranscriptContextValue["addTranscriptBreadcrumb"] = (title, data) => {
    setTranscriptItems((prev) => [
      ...prev,
      {
        itemId: `breadcrumb-${uuidv4()}`,
        type: "BREADCRUMB",
        title,
        data,
        expanded: false,
        timestamp: newTimestampPretty(),
        createdAtMs: Date.now(),
        status: "DONE",
        isHidden: false,
      },
    ]);
  };

  const toggleTranscriptItemExpand: TranscriptContextValue["toggleTranscriptItemExpand"] = (itemId) => {
    setTranscriptItems((prev) =>
      prev.map((log) =>
        log.itemId === itemId ? { ...log, expanded: !log.expanded } : log
      )
    );
  };

  const updateTranscriptItem: TranscriptContextValue["updateTranscriptItem"] = (itemId, updatedProperties) => {
    setTranscriptItems((prev) =>
      prev.map((item) =>
        item.itemId === itemId ? { ...item, ...updatedProperties } : item
      )
    );
  };

  const saveConversation = async (sessionId: string): Promise<boolean> => {
    try {
      // 메시지만 필터링 (BREADCRUMB 제외)
      const messages = transcriptItems
        .filter(item => item.type === "MESSAGE" && !item.isHidden && item.title?.trim())
        .map(item => ({
          id: item.itemId,
          role: item.role,
          content: item.title || '',
          timestamp: new Date(item.createdAtMs).toISOString(),
          agent: item.role === 'assistant' ? 'virtualChat' : undefined
        }));

      if (messages.length === 0) {
        console.log('저장할 메시지가 없습니다.');
        return false;
      }

      const conversationData = {
        sessionId,
        startTime: sessionStartTime || new Date().toISOString(),
        endTime: new Date().toISOString(),
        messages
      };

      const response = await fetch('/api/save-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conversationData)
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log(`대화 저장 성공: ${result.fileName || result.consultation_id}`);
        console.log(`총 ${result.consulting_turns}개 턴, 상담시간: ${result.duration}`);
        
        // 🔥 분류 결과 표시
        if (result.classification) {
          const { category, confidence, analysis } = result.classification;
          addTranscriptBreadcrumb(
            `🎯 상담 분류: ${category} (신뢰도: ${(confidence * 100).toFixed(1)}%)`
          );
          addTranscriptBreadcrumb(
            `📋 문제상황: ${analysis.problem_situation}`
          );
          addTranscriptBreadcrumb(
            `💡 해결방안: ${analysis.solution_approach}`
          );
          addTranscriptBreadcrumb(
            `🎯 예상결과: ${analysis.expected_outcome}`
          );
        } else {
          addTranscriptBreadcrumb('⚠️ 분류 서비스를 사용할 수 없어 자동 분류가 수행되지 않았습니다.');
        }
        
        return true;
      } else {
        console.error('대화 저장 실패:', result.error);
        return false;
      }
    } catch (error) {
      console.error('대화 저장 중 오류:', error);
      return false;
    }
  };

  const clearTranscript = () => {
    setTranscriptItems([]);
    setSessionStartTime(null);
  };

  return (
    <TranscriptContext.Provider
      value={{
        transcriptItems,
        addTranscriptMessage,
        updateTranscriptMessage,
        addTranscriptBreadcrumb,
        toggleTranscriptItemExpand,
        updateTranscriptItem,
        saveConversation,
        clearTranscript,
      }}
    >
      {children}
    </TranscriptContext.Provider>
  );
};

export function useTranscript() {
  const context = useContext(TranscriptContext);
  if (!context) {
    throw new Error("useTranscript must be used within a TranscriptProvider");
  }
  return context;
}