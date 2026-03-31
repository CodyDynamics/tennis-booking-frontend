import { useState, useMemo } from "react";
import type { ProgressReport } from "@/types";

export function useReports(studentId?: string) {
  const [reports, setReports] = useState<ProgressReport[]>([]);

  const filteredReports = useMemo(() => {
    if (!studentId) return reports;
    return reports.filter((r) => r.studentId === studentId);
  }, [reports, studentId]);

  const createReport = async (reportData: Partial<ProgressReport>) => {
    // TODO: API call
    const newReport: ProgressReport = {
      id: Date.now().toString(),
      coachId: reportData.coachId || "",
      studentId: reportData.studentId || "",
      sessionId: reportData.sessionId ?? null,
      sessionDate: reportData.sessionDate || new Date().toISOString().split("T")[0],
      forehandScore: reportData.forehandScore || 5,
      backhandScore: reportData.backhandScore || 5,
      serveScore: reportData.serveScore || 5,
      footworkScore: reportData.footworkScore || 5,
      staminaScore: reportData.staminaScore || 5,
      attendance: reportData.attendance || "present",
      overallComment: reportData.overallComment,
      improvementPlan: reportData.improvementPlan,
      nextGoal: reportData.nextGoal,
      createdAt: new Date().toISOString(),
    };
    setReports([...reports, newReport]);
    return newReport;
  };

  const averageScores = useMemo(() => {
    if (filteredReports.length === 0) return null;
    return {
      forehand: filteredReports.reduce((sum, r) => sum + r.forehandScore, 0) / filteredReports.length,
      backhand: filteredReports.reduce((sum, r) => sum + r.backhandScore, 0) / filteredReports.length,
      serve: filteredReports.reduce((sum, r) => sum + r.serveScore, 0) / filteredReports.length,
      footwork: filteredReports.reduce((sum, r) => sum + r.footworkScore, 0) / filteredReports.length,
      stamina: filteredReports.reduce((sum, r) => sum + r.staminaScore, 0) / filteredReports.length,
    };
  }, [filteredReports]);

  const attendanceRate = useMemo(() => {
    if (filteredReports.length === 0) return 0;
    const presentCount = filteredReports.filter((r) => r.attendance === "present").length;
    return (presentCount / filteredReports.length) * 100;
  }, [filteredReports]);

  return {
    reports: filteredReports,
    averageScores,
    attendanceRate,
    createReport,
  };
}
