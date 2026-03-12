"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateReport } from "@/lib/queries";
import { format } from "date-fns";
import { reportSchema, type ReportFormValues } from "@/features/reports/schemas/report.schema";

interface ReportFormProps {
  studentId: string;
  coachId: string;
}

export function ReportForm({ studentId, coachId }: ReportFormProps) {
  const createReport = useCreateReport();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      forehandScore: 5,
      backhandScore: 5,
      serveScore: 5,
      footworkScore: 5,
      staminaScore: 5,
      attendance: true,
    },
  });

  const forehandScore = watch("forehandScore");
  const backhandScore = watch("backhandScore");
  const serveScore = watch("serveScore");
  const footworkScore = watch("footworkScore");
  const staminaScore = watch("staminaScore");
  const attendance = watch("attendance");

  const handleFormSubmit = async (data: ReportFormValues) => {
    try {
      await createReport.mutateAsync({
        coachId,
        studentId,
        sessionDate: format(new Date(), "yyyy-MM-dd"),
        forehandScore: data.forehandScore,
        backhandScore: data.backhandScore,
        serveScore: data.serveScore,
        footworkScore: data.footworkScore,
        staminaScore: data.staminaScore,
        attendance: data.attendance ? "present" : "absent",
        overallComment: data.overallComment,
        improvementPlan: data.improvementPlan,
        nextGoal: data.nextGoal,
      });
      router.push("/dashboard");
    } catch (error) {
      console.error("Report submission failed:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress Report</CardTitle>
        <CardDescription>Fill out the progress report for this session</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Skill Ratings (1-10)</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Forehand</Label>
                <span className="text-sm font-medium">{forehandScore}</span>
              </div>
              <Slider
                value={[forehandScore]}
                onValueChange={(value) => setValue("forehandScore", value[0])}
                min={1}
                max={10}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Backhand</Label>
                <span className="text-sm font-medium">{backhandScore}</span>
              </div>
              <Slider
                value={[backhandScore]}
                onValueChange={(value) => setValue("backhandScore", value[0])}
                min={1}
                max={10}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Serve</Label>
                <span className="text-sm font-medium">{serveScore}</span>
              </div>
              <Slider
                value={[serveScore]}
                onValueChange={(value) => setValue("serveScore", value[0])}
                min={1}
                max={10}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Footwork</Label>
                <span className="text-sm font-medium">{footworkScore}</span>
              </div>
              <Slider
                value={[footworkScore]}
                onValueChange={(value) => setValue("footworkScore", value[0])}
                min={1}
                max={10}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Stamina</Label>
                <span className="text-sm font-medium">{staminaScore}</span>
              </div>
              <Slider
                value={[staminaScore]}
                onValueChange={(value) => setValue("staminaScore", value[0])}
                min={1}
                max={10}
                step={1}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="attendance"
              checked={attendance}
              onCheckedChange={(checked) => setValue("attendance", checked === true)}
            />
            <Label htmlFor="attendance" className="cursor-pointer">
              Student was present
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="overallComment">Overall Comment</Label>
            <Textarea
              id="overallComment"
              placeholder="Overall feedback about the session..."
              {...register("overallComment")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="improvementPlan">Improvement Plan</Label>
            <Textarea
              id="improvementPlan"
              placeholder="Areas to focus on for improvement..."
              {...register("improvementPlan")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextGoal">Next Goal</Label>
            <Input
              id="nextGoal"
              placeholder="What should the student work on next?"
              {...register("nextGoal")}
            />
          </div>

          <Button type="submit" className="w-full" disabled={createReport.isPending}>
            {createReport.isPending ? "Submitting..." : "Submit Report"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
