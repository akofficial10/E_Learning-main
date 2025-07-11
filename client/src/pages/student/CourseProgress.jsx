import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  useCompleteCourseMutation,
  useGetCourseProgressQuery,
  useInCompleteCourseMutation,
  useUpdateLectureProgressMutation,
} from "@/features/api/courseProgressApi";
import {
  CheckCircle,
  CheckCircle2,
  CirclePlay,
  MessageSquare,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import Chat from "@/components/Chat";

const CourseProgress = () => {
  const params = useParams();
  const courseId = params.courseId;

  const { data, isLoading, isError, refetch } =
    useGetCourseProgressQuery(courseId);

  const [updateLectureProgress] = useUpdateLectureProgressMutation();
  const [completeCourse] = useCompleteCourseMutation();
  const [inCompleteCourse] = useInCompleteCourseMutation();

  const [currentLecture, setCurrentLecture] = useState(null);
  const [localCompleted, setLocalCompleted] = useState(null);

  useEffect(() => {
    if (data?.data?.completed !== undefined) {
      setLocalCompleted(null); // Reset local override on fetch
    }
  }, [data]);

  if (isLoading) return <p>Loading...</p>;
  if (isError) return <p>Failed to load course details</p>;

  if (!data?.data?.courseDetails) {
    return <p>Course data not available</p>;
  }

  const { courseDetails, progress, completed, purchased } = data.data;
  const { courseTitle, creator: instructor, lectures } = courseDetails;

  const isCompleted = localCompleted !== null ? localCompleted : completed;

  const initialLecture = currentLecture || lectures?.[0];

  const isLectureCompleted = (lectureId) => {
    return (
      progress?.some((prog) => prog.lectureId === lectureId && prog.viewed) ||
      false
    );
  };

  const handleLectureProgress = async (lectureId) => {
    try {
      await updateLectureProgress({ courseId, lectureId });
      refetch();
    } catch (error) {
      toast.error("Failed to update lecture progress");
    }
  };

  const handleSelectLecture = (lecture) => {
    setCurrentLecture(lecture);
  };

  const handleCompleteCourse = async () => {
    try {
      setLocalCompleted(true);
      const result = await completeCourse(courseId);
      toast.success(result?.data?.message || "Course marked as completed!");
      await refetch();
      setLocalCompleted(null);
    } catch (error) {
      toast.error("Failed to mark course as completed.");
      setLocalCompleted(null);
    }
  };

  const handleInCompleteCourse = async () => {
    try {
      setLocalCompleted(false);
      const result = await inCompleteCourse(courseId);
      toast.success(result?.data?.message || "Course marked as incomplete.");
      await refetch();
      setLocalCompleted(null);
    } catch (error) {
      toast.error("Failed to mark course as incomplete.");
      setLocalCompleted(null);
    }
  };

  if (!lectures || lectures.length === 0) {
    return <p>No lectures available for this course</p>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header Section */}
      <div className="flex justify-between mb-4 flex-col md:flex-row gap-2 md:gap-0">
        <h1 className="text-2xl font-bold">{courseTitle}</h1>
        <div className="flex items-center gap-2">
          {purchased && instructor?._id && (
            <Chat
              courseId={courseId}
              instructorId={instructor._id}
              triggerButton={
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat with Instructor
                </Button>
              }
            />
          )}

          <Button
            onClick={
              isCompleted ? handleInCompleteCourse : handleCompleteCourse
            }
            variant={isCompleted ? "outline" : "default"}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            {isCompleted ? "Completed" : "Mark as completed"}
          </Button>
        </div>
      </div>

      {isCompleted && (
        <p className="text-sm text-green-600 mb-4">
          🎉 You've completed the course. A certificate has been emailed to you!
        </p>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Lecture Video/PDF Section */}
        <div className="flex-1 md:w-3/5 h-fit rounded-lg shadow-lg p-4">
          <div>
            {(() => {
              const currentUrl =
                currentLecture?.videoUrl || initialLecture?.videoUrl;
              const isPdf = currentUrl?.toLowerCase().endsWith(".pdf");

              return isPdf ? (
                <div className="flex flex-col items-center justify-center border border-dashed border-gray-400 p-8 rounded-lg text-center">
                  <p className="mb-4 text-lg font-medium">
                    This lecture contains a PDF resource.
                  </p>
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                    onClick={() =>
                      handleLectureProgress(
                        currentLecture?._id || initialLecture._id
                      )
                    }
                  >
                    View PDF
                  </a>
                </div>
              ) : (
                <video
                  src={currentUrl}
                  controls
                  className="w-full h-auto md:rounded-lg"
                  onPlay={() =>
                    handleLectureProgress(
                      currentLecture?._id || initialLecture._id
                    )
                  }
                />
              );
            })()}
          </div>

          {/* Current Lecture Title */}
          <div className="mt-2">
            <h3 className="font-medium text-lg">
              {`Lecture ${
                lectures.findIndex(
                  (lec) =>
                    lec._id === (currentLecture?._id || initialLecture._id)
                ) + 1
              } : ${
                currentLecture?.lectureTitle || initialLecture.lectureTitle
              }`}
            </h3>
          </div>
        </div>

        {/* Sidebar: Lecture List */}
        <div className="flex flex-col w-full md:w-2/5 border-t md:border-t-0 md:border-l border-gray-200 md:pl-4 pt-4 md:pt-0">
          <h2 className="font-semibold text-xl mb-4">Course Lectures</h2>
          <div className="flex-1 overflow-y-auto">
            {lectures.map((lecture) => (
              <Card
                key={lecture._id}
                className={`mb-3 hover:cursor-pointer transition transform ${
                  lecture._id === currentLecture?._id
                    ? "bg-gray-200 dark:dark:bg-gray-800"
                    : ""
                }`}
                onClick={() => handleSelectLecture(lecture)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center">
                    {isCompleted || isLectureCompleted(lecture._id) ? (
                      <CheckCircle2 size={24} className="text-green-500 mr-2" />
                    ) : (
                      <CirclePlay size={24} className="text-gray-500 mr-2" />
                    )}
                    <div>
                      <CardTitle className="text-lg font-medium">
                        {lecture.lectureTitle}
                      </CardTitle>
                    </div>
                  </div>
                  {(isCompleted || isLectureCompleted(lecture._id)) && (
                    <Badge
                      variant={"outline"}
                      className="bg-green-200 text-green-600"
                    >
                      Completed
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseProgress;
