import { CourseProgress } from "../models/courseProgress.js";
import { Course } from "../models/course.model.js";
import { generateCertificate } from "../utils/generateCertificate.js";
import { sendCertificateEmail } from "../utils/sendEmail.js";
import {User} from "../models/user.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";

export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    // Step-1: Fetch the user course progress
    let courseProgress = await CourseProgress.findOne({
      courseId,
      userId,
    }).populate("courseId");

    const courseDetails = await Course.findById(courseId)
      .populate("lectures")
      .populate("creator", "name avatar"); // Optional: for instructor info

    if (!courseDetails) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    // Step-2: Check if user has purchased the course
    const purchase = await CoursePurchase.findOne({
      courseId,
      userId,
      status: "completed",
    });

    const purchased = !!purchase;

    // Step-3: If no progress found, return course details with empty progress
    if (!courseProgress) {
      return res.status(200).json({
        data: {
          courseDetails,
          progress: [],
          completed: false,
          purchased,
        },
      });
    }

    // Step-4: Return the user's course progress
    return res.status(200).json({
      data: {
        courseDetails,
        progress: courseProgress.lectureProgress,
        completed: courseProgress.completed,
        purchased,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateLectureProgress = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;
    const userId = req.id;

    // fetch or create course progress
    let courseProgress = await CourseProgress.findOne({ courseId, userId });

    if (!courseProgress) {
      // If no progress exist, create a new record
      courseProgress = new CourseProgress({
        userId,
        courseId,
        completed: false,
        lectureProgress: [],
      });
    }

    // find the lecture progress in the course progress
    const lectureIndex = courseProgress.lectureProgress.findIndex(
      (lecture) => lecture.lectureId === lectureId
    );

    if (lectureIndex !== -1) {
      // if lecture already exist, update its status
      courseProgress.lectureProgress[lectureIndex].viewed = true;
    } else {
      // Add new lecture progress
      courseProgress.lectureProgress.push({
        lectureId,
        viewed: true,
      });
    }

    // if all lecture is complete
    const lectureProgressLength = courseProgress.lectureProgress.filter(
      (lectureProg) => lectureProg.viewed
    ).length;

    const user = await User.findById(userId);
    const course = await Course.findById(courseId);

    if (course.lectures.length === lectureProgressLength)
      courseProgress.completed = true;
      // Generate certificate PDF
      const certPath = await generateCertificate(user.name, course.courseTitle);
      //console.log(" Certificate generated at:", certPath);

      // Send the certificate via email
      await sendCertificateEmail(user.email, certPath);
      console.log(" Certificate email sent to:", user.email);

    await courseProgress.save();

    return res.status(200).json({
      message: "Lecture progress updated successfully.",
    });
  } catch (error) {
    console.log(error);
  }
};

export const markAsCompleted = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    const course = await Course.findById(courseId);
    const user = await User.findById(userId);

    const courseProgress = await CourseProgress.findOne({ courseId, userId });
    if (!courseProgress)
      return res.status(404).json({ message: "Course progress not found" });

    courseProgress.lectureProgress.map(
      (lectureProgress) => (lectureProgress.viewed = true)
    );
    courseProgress.completed = true;
    await courseProgress.save();

    // Generate certificate PDF
    const certPath = await generateCertificate(user.name, course.courseTitle);
    //console.log(" Certificate generated at:", certPath);

    // Send the certificate via email
    await sendCertificateEmail(user.email, certPath);
    console.log(" Certificate email sent to:", user.email);

    return res.status(200).json({ message: "Course marked as completed." });
  } catch (error) {
    console.log(error);
  }
};

export const markAsInCompleted = async (req, res) => {
    try {
      const { courseId } = req.params;
      const userId = req.id;
  
      const courseProgress = await CourseProgress.findOne({ courseId, userId });
      if (!courseProgress)
        return res.status(404).json({ message: "Course progress not found" });
  
      courseProgress.lectureProgress.map(
        (lectureProgress) => (lectureProgress.viewed = false)
      );
      courseProgress.completed = false;
      await courseProgress.save();
      return res.status(200).json({ message: "Course marked as incompleted." });
    } catch (error) {
      console.log(error);
    }
  };
