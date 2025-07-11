/*import PDFDocument from "pdfkit";
import fs from "fs";

export const generateCertificate = async (studentName, courseTitle) => {
  const doc = new PDFDocument();
  const certPath = `./certificates/${studentName.replace(" ", "_")}_${Date.now()}.pdf`;

  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(certPath);
    doc.pipe(stream);

    doc.fontSize(26).text("Certificate of Completion", {
      align: "center",
    });

    doc.moveDown();
    doc.fontSize(20).text(`This is to certify that`, {
      align: "center",
    });

    doc.moveDown();
    doc.fontSize(22).text(`${studentName}`, {
      align: "center",
      underline: true,
    });

    doc.moveDown();
    doc.fontSize(20).text(`has successfully completed the course`, {
      align: "center",
    });

    doc.moveDown();
    doc.fontSize(22).text(`${courseTitle}`, {
      align: "center",
    });

    doc.end();

    stream.on("finish", () => {
      resolve(certPath);
    });

    stream.on("error", (err) => {
      reject(err);
    });
  });
};
*/
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export const generateCertificate = async (studentName, courseTitle) => {
  const certDir = path.join("certificates");

  //  Create the directory if it doesn't exist
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  const certPath = path.join(
    certDir,
    `${studentName.replace(/\s+/g, "_")}_${Date.now()}.pdf`
  );

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(certPath);

    doc.pipe(stream);

    doc.fontSize(26).text("Certificate of Completion", {
      align: "center",
    });

    doc.moveDown();
    doc.fontSize(20).text(`This is to certify that`, {
      align: "center",
    });

    doc.moveDown();
    doc.fontSize(22).text(`${studentName}`, {
      align: "center",
      underline: true,
    });

    doc.moveDown();
    doc.fontSize(20).text(`has successfully completed the course`, {
      align: "center",
    });

    doc.moveDown();
    doc.fontSize(22).text(`${courseTitle}`, {
      align: "center",
    });

    doc.end();

    stream.on("finish", () => {
      resolve(certPath);
    });

    stream.on("error", (err) => {
      reject(err);
    });
  });
};
