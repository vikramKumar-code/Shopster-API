import PDFDocument from "pdfkit";

export const generatePDFInvoice = async (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        bufferPages: true,
        margin: 50,
        size: "A4",
      });

      // Collect PDF chunks
      const chunks = [];

      doc.on("data", (chunk) => {
        chunks.push(chunk);
      });

      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on("error", (error) => {
        reject(error);
      });

      // ------------------------------------
      // Invoice information
      // ------------------------------------

      const invoiceNumber = order._id
        .toString()
        .slice(-8)
        .toUpperCase();

      const orderDate = new Date(
        order.createdAt,
      ).toLocaleDateString("en-IN");

      const paymentDate = order.paidAt
        ? new Date(
            order.paidAt,
          ).toLocaleDateString("en-IN")
        : "N/A";

      // ====================================
      // HEADER
      // ====================================

      doc
        .font("Helvetica-Bold")
        .fontSize(26)
        .text("SHOPSTER", {
          align: "center",
        });

      doc
        .font("Helvetica")
        .fontSize(13)
        .text("INVOICE", {
          align: "center",
        });

      doc.moveDown(2);

      // Horizontal line
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke();

      doc.moveDown();

      // ====================================
      // INVOICE DETAILS
      // ====================================

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("Invoice Details");

      doc.moveDown(0.5);

      doc
        .font("Helvetica")
        .fontSize(10);

      doc.text(
        `Invoice Number: ${invoiceNumber}`,
      );

      doc.text(
        `Order ID: ${order._id}`,
      );

      doc.text(
        `Invoice Date: ${orderDate}`,
      );

      doc.text(
        `Payment Date: ${paymentDate}`,
      );

      doc.text(
        `Payment Method: ${
          order.paymentMethod || "N/A"
        }`,
      );

      doc.text(
        `Payment Status: ${
          order.paymentStatus || "N/A"
        }`,
      );

      doc.moveDown(1.5);

      // ====================================
      // BUYER DETAILS
      // ====================================

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("Bill To");

      doc.moveDown(0.5);

      doc
        .font("Helvetica")
        .fontSize(10);

      doc.text(
        `Name: ${
          order.buyer?.username ||
          order.buyer?.name ||
          "Customer"
        }`,
      );

      doc.text(
        `Email: ${
          order.buyer?.email || "N/A"
        }`,
      );

      doc.text(
        `Phone: ${
          order.buyer?.phone || "N/A"
        }`,
      );

      doc.text(
        `Address: ${
          order.shippingAddress ||
          order.buyer?.address ||
          "N/A"
        }`,
      );

      doc.moveDown(2);

      // ====================================
      // ITEM TABLE
      // ====================================

      const tableTop = doc.y;

      const productX = 50;
      const quantityX = 290;
      const priceX = 360;
      const totalX = 455;

      // Header
      doc
        .font("Helvetica-Bold")
        .fontSize(10);

      doc.text(
        "Product",
        productX,
        tableTop,
      );

      doc.text(
        "Qty",
        quantityX,
        tableTop,
        {
          width: 40,
          align: "center",
        },
      );

      doc.text(
        "Price",
        priceX,
        tableTop,
        {
          width: 75,
          align: "right",
        },
      );

      doc.text(
        "Total",
        totalX,
        tableTop,
        {
          width: 90,
          align: "right",
        },
      );

      // Line below table header
      doc
        .moveTo(
          50,
          tableTop + 18,
        )
        .lineTo(
          545,
          tableTop + 18,
        )
        .stroke();

      let yPosition =
        tableTop + 30;

      doc
        .font("Helvetica")
        .fontSize(9);

      // ====================================
      // ITEM ROWS
      // ====================================

      (order.items || []).forEach(
        (item) => {
          const price = Number(
            item.price || 0,
          );

          const quantity = Number(
            item.quantity || 0,
          );

          const itemTotal =
            price * quantity;

          // New page if table gets too long
          if (yPosition > 720) {
            doc.addPage();

            yPosition = 60;

            doc
              .font("Helvetica-Bold")
              .fontSize(10)
              .text(
                "Product",
                productX,
                yPosition,
              );

            doc.text(
              "Qty",
              quantityX,
              yPosition,
              {
                width: 40,
                align: "center",
              },
            );

            doc.text(
              "Price",
              priceX,
              yPosition,
              {
                width: 75,
                align: "right",
              },
            );

            doc.text(
              "Total",
              totalX,
              yPosition,
              {
                width: 90,
                align: "right",
              },
            );

            doc
              .moveTo(
                50,
                yPosition + 18,
              )
              .lineTo(
                545,
                yPosition + 18,
              )
              .stroke();

            yPosition += 30;

            doc
              .font("Helvetica")
              .fontSize(9);
          }

          doc.text(
            item.name || "Product",
            productX,
            yPosition,
            {
              width: 220,
            },
          );

          doc.text(
            quantity.toString(),
            quantityX,
            yPosition,
            {
              width: 40,
              align: "center",
            },
          );

          doc.text(
            `Rs. ${price.toFixed(2)}`,
            priceX,
            yPosition,
            {
              width: 75,
              align: "right",
            },
          );

          doc.text(
            `Rs. ${itemTotal.toFixed(2)}`,
            totalX,
            yPosition,
            {
              width: 90,
              align: "right",
            },
          );

          yPosition += 25;
        },
      );

      // ====================================
      // BOTTOM LINE
      // ====================================

      doc
        .moveTo(50, yPosition)
        .lineTo(545, yPosition)
        .stroke();

      yPosition += 20;

      // ====================================
      // TOTALS
      // ====================================

      const totalAmount = Number(
        order.totalAmount || 0,
      );

      doc
        .font("Helvetica-Bold")
        .fontSize(11);

      doc.text(
        `Total Amount: Rs. ${totalAmount.toFixed(
          2,
        )}`,
        350,
        yPosition,
        {
          width: 195,
          align: "right",
        },
      );

      yPosition += 35;

      // ====================================
      // PAYMENT STATUS
      // ====================================

      doc
        .font("Helvetica")
        .fontSize(10);

      doc.text(
        `Payment Status: ${
          order.paymentStatus || "N/A"
        }`,
        50,
        yPosition,
      );

      if (order.paymentStatus === "Paid") {
        yPosition += 18;

        doc
          .font("Helvetica-Bold")
          .text(
            "Payment Completed Successfully",
            50,
            yPosition,
          );
      }

      // ====================================
      // FOOTER
      // ====================================

      doc.moveDown(4);

      doc
        .font("Helvetica")
        .fontSize(8)
        .text(
          "Thank you for your purchase!",
          {
            align: "center",
          },
        );

      doc.text(
        "Shopster | support@shopster.in",
        {
          align: "center",
        },
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

export default generatePDFInvoice;