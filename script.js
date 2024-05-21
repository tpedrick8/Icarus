$(document).ready(function() {
    let currentHeaders = [];

    $('#fileInput').on('change', function(e) {
        const file = e.target.files[0];
        console.log("File selected:", file);

        if (file && (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || file.type === "application/vnd.ms-excel")) {
            $('#loadingSpinner').show();
            $('#errorMessage').hide();
            const reader = new FileReader();

            reader.onload = function(event) {
                try {
                    console.log("File is being read...");
                    const data = new Uint8Array(event.target.result);
                    console.log("Data read from file:", data);

                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetNames = workbook.SheetNames;
                    console.log("Sheet names:", sheetNames);

                    populateSheetSelect(sheetNames, workbook);
                } catch (error) {
                    console.error("Error processing the file:", error);
                    $('#errorMessage').text(`Error processing the file: ${error.message}`).show();
                } finally {
                    $('#loadingSpinner').hide();
                }
            };

            reader.onerror = function(error) {
                console.error("Error reading the file:", error);
                $('#errorMessage').text(`Error reading the file: ${error.message}`).show();
                $('#loadingSpinner').hide();
            };

            reader.readAsArrayBuffer(file);
        } else {
            console.error("Invalid file type:", file.type);
            $('#errorMessage').text("Invalid file type. Please upload a valid Excel file.").show();
        }
    });

    function populateSheetSelect(sheetNames, workbook) {
        const sheetSelect = $('#sheetSelect');
        sheetSelect.empty();
        sheetNames.forEach((sheetName, index) => {
            sheetSelect.append(`<option value="${index}">${sheetName}</option>`);
        });
        sheetSelect.show();

        const firstSheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[0]], { header: 1 });
        displayData(firstSheet, sheetNames[0]);

        sheetSelect.off('change').on('change', function() {
            const selectedSheetIndex = $(this).val();
            const selectedSheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[selectedSheetIndex]], { header: 1 });
            displayData(selectedSheet, sheetNames[selectedSheetIndex]);
        });
    }

    function displayData(data, sheetName) {
        console.log(`Displaying data for sheet: ${sheetName}`);

        const dataTable = $('#dataTable');
        if ($.fn.DataTable.isDataTable(dataTable)) {
            dataTable.DataTable().clear().destroy();
        }

        const tableHead = $("#dataTable thead");
        const tableBody = $("#dataTable tbody");

        tableHead.empty();
        tableBody.empty();

        if (!data || !Array.isArray(data) || data.length === 0) {
            console.error("Invalid data:", data);
            $('#errorMessage').text("Invalid data.").show();
            return;
        }

        currentHeaders = data[0];
        console.log("Headers:", currentHeaders);
        if (!currentHeaders || !Array.isArray(currentHeaders)) {
            console.error("Invalid headers:", currentHeaders);
            $('#errorMessage').text("Invalid headers.").show();
            return;
        }

        let headerRow = $("<tr></tr>");
        currentHeaders.forEach(header => {
            headerRow.append(`<th>${header}</th>`);
        });
        tableHead.append(headerRow);

        let rowData = [];
        data.slice(1).forEach((row, rowIndex) => {
            while (row.length < currentHeaders.length) {
                row.push('');
            }

            if (row.every(cell => cell === '')) {
                console.warn(`Skipping empty row ${rowIndex + 1}:`, row);
                return;
            }

            rowData.push(row);
        });

        try {
            const table = dataTable.DataTable({
                data: rowData,
                columns: currentHeaders.map(header => ({ title: header })),
                pageLength: 25,
                autoWidth: false,
                destroy: true,
                columnDefs: [{ "targets": "_all", "defaultContent": "" }]
            });
            console.log("Data displayed successfully.");

            $('#dataTable tbody').off('click', 'tr').on('click', 'tr', function() {
                const rowData = table.row(this).data();
                displayModal(rowData);
            });
        } catch (error) {
            console.error("Error initializing DataTable:", error);
            $('#errorMessage').text(`Error initializing DataTable: ${error.message}`).show();
        }
    }

    function displayModal(rowData) {
        const modalBody = $('#modalBody');
        modalBody.empty();

        const halfLength = Math.ceil(rowData.length / 2);
        const leftData = rowData.slice(0, halfLength);
        const rightData = rowData.slice(halfLength);

        const leftColumn = $("<div class='modal-column'></div>");
        const rightColumn = $("<div class='modal-column'></div>");

        leftData.forEach((cell, index) => {
            leftColumn.append(`<p><strong>${currentHeaders[index]}:</strong> ${cell}</p>`);
        });

        rightData.forEach((cell, index) => {
            rightColumn.append(`<p><strong>${currentHeaders[index + halfLength]}:</strong> ${cell}</p>`);
        });

        modalBody.append(leftColumn);
        modalBody.append(rightColumn);

        $('#dataModal').modal('show');
    }
});
