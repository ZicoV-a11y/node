"""
AV Routing System with VBA Macros
Creates macro-enabled Excel (.xlsm) with:
- Add/Delete row buttons in each section
- Interactive device management
- Routing matrix with controls
"""

import os
import sys

def create_av_router_macro(output_path=None):
    if output_path is None:
        output_path = os.path.join(os.path.dirname(__file__), '..', '.tmp', 'av_router_interactive.xlsm')

    try:
        import win32com.client as win32
        from win32com.client import constants
    except ImportError:
        print("ERROR: pywin32 not installed. Run: pip install pywin32")
        print("Then restart Python/terminal.")
        sys.exit(1)

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Remove existing file if present
    if os.path.exists(output_path):
        os.remove(output_path)

    # Create Excel Application
    excel = win32.gencache.EnsureDispatch('Excel.Application')
    excel.Visible = False
    excel.DisplayAlerts = False

    try:
        wb = excel.Workbooks.Add()

        # ===== COLORS =====
        def rgb(r, g, b):
            return r + (g * 256) + (b * 256 * 256)

        DARK_BG = rgb(26, 26, 46)
        HEADER_BG = rgb(45, 45, 68)
        ROW_BG = rgb(37, 37, 56)
        INPUT_GREEN = rgb(46, 125, 50)
        OUTPUT_BLUE = rgb(21, 101, 192)
        ROUTING_PURPLE = rgb(106, 27, 154)
        BTN_ADD = rgb(76, 175, 80)
        BTN_DEL = rgb(244, 67, 54)

        # ===== SHEET 1: DEVICES =====
        ws = wb.Worksheets(1)
        ws.Name = "Devices"
        ws.Tab.Color = rgb(68, 114, 196)

        # Set background
        ws.Range("A1:N30").Interior.Color = DARK_BG

        # Title
        ws.Range("B2:H2").Merge()
        ws.Range("B2").Value = "AV SYSTEM - DEVICE MANAGER"
        ws.Range("B2").Font.Bold = True
        ws.Range("B2").Font.Color = rgb(255, 255, 255)
        ws.Range("B2").Font.Size = 14
        ws.Range("B2").Interior.Color = HEADER_BG
        ws.Range("B2").HorizontalAlignment = -4108  # Center

        # Headers
        headers = ["ID", "Device Name", "Type", "Inputs", "Outputs", "Color"]
        for i, h in enumerate(headers):
            cell = ws.Cells(4, 2 + i)
            cell.Value = h
            cell.Font.Bold = True
            cell.Font.Color = rgb(255, 255, 255)
            cell.Interior.Color = HEADER_BG
            cell.Borders.LineStyle = 1

        # Sample devices
        devices = [
            [1, "Laptop", "Source", 0, 3, "Blue"],
            [2, "Video Switcher", "Processor", 4, 2, "Purple"],
            [3, "Display", "Destination", 3, 0, "Teal"],
            [4, "Audio Mixer", "Processor", 4, 3, "Red"],
        ]

        for row_idx, dev in enumerate(devices):
            for col_idx, val in enumerate(dev):
                cell = ws.Cells(5 + row_idx, 2 + col_idx)
                cell.Value = val
                cell.Font.Color = rgb(255, 255, 255)
                cell.Interior.Color = ROW_BG
                cell.Borders.LineStyle = 1

        # Column widths
        ws.Columns("A").ColumnWidth = 3
        ws.Columns("B").ColumnWidth = 6
        ws.Columns("C").ColumnWidth = 18
        ws.Columns("D").ColumnWidth = 12
        ws.Columns("E").ColumnWidth = 8
        ws.Columns("F").ColumnWidth = 8
        ws.Columns("G").ColumnWidth = 10

        # ===== SHEET 2: ROUTING =====
        ws2 = wb.Worksheets.Add(After=wb.Worksheets(wb.Worksheets.Count))
        ws2.Name = "Routing"
        ws2.Tab.Color = ROUTING_PURPLE

        ws2.Range("A1:N30").Interior.Color = DARK_BG

        # Title
        ws2.Range("B2:J2").Merge()
        ws2.Range("B2").Value = "SIGNAL ROUTING MATRIX"
        ws2.Range("B2").Font.Bold = True
        ws2.Range("B2").Font.Color = rgb(255, 255, 255)
        ws2.Range("B2").Font.Size = 14
        ws2.Range("B2").Interior.Color = ROUTING_PURPLE
        ws2.Range("B2").HorizontalAlignment = -4108

        # Headers
        route_headers = ["#", "Source", "Output", "→", "Dest", "Input", "Type", "Status"]
        for i, h in enumerate(route_headers):
            cell = ws2.Cells(4, 2 + i)
            cell.Value = h
            cell.Font.Bold = True
            cell.Font.Color = rgb(255, 255, 255)
            cell.Interior.Color = HEADER_BG
            cell.Borders.LineStyle = 1

        # Sample routes
        routes = [
            [1, "Laptop", "HDMI Out", "→", "Video Switcher", "Input 1", "Video", "Active"],
            [2, "Video Switcher", "Program", "→", "Display", "HDMI 1", "Video", "Active"],
            [3, "Laptop", "Audio Out", "→", "Audio Mixer", "Line In", "Audio", "Active"],
        ]

        for row_idx, route in enumerate(routes):
            for col_idx, val in enumerate(route):
                cell = ws2.Cells(5 + row_idx, 2 + col_idx)
                cell.Value = val
                cell.Font.Color = rgb(255, 255, 255) if col_idx != 3 else rgb(0, 255, 0)
                cell.Interior.Color = ROW_BG
                cell.Borders.LineStyle = 1
                if col_idx == 3:
                    cell.Font.Bold = True
                    cell.HorizontalAlignment = -4108

        # Column widths
        ws2.Columns("A").ColumnWidth = 3
        ws2.Columns("B").ColumnWidth = 5
        ws2.Columns("C").ColumnWidth = 16
        ws2.Columns("D").ColumnWidth = 12
        ws2.Columns("E").ColumnWidth = 4
        ws2.Columns("F").ColumnWidth = 16
        ws2.Columns("G").ColumnWidth = 12
        ws2.Columns("H").ColumnWidth = 10
        ws2.Columns("I").ColumnWidth = 10

        # Data validation for Status
        ws2.Range("I5:I50").Validation.Add(
            Type=3,  # xlValidateList
            Formula1="Active,Inactive,Testing,Fault"
        )

        # ===== ADD VBA CODE =====
        vba_code = '''
Sub AddDeviceRow()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Worksheets("Devices")
    Dim lastRow As Long
    lastRow = ws.Cells(ws.Rows.Count, "B").End(xlUp).Row

    ' Insert new row
    lastRow = lastRow + 1
    ws.Cells(lastRow, 2).Value = lastRow - 4
    ws.Cells(lastRow, 3).Value = "New Device"
    ws.Cells(lastRow, 4).Value = "Source"
    ws.Cells(lastRow, 5).Value = 0
    ws.Cells(lastRow, 6).Value = 0
    ws.Cells(lastRow, 7).Value = "Gray"

    ' Format
    ws.Range(ws.Cells(lastRow, 2), ws.Cells(lastRow, 7)).Interior.Color = RGB(37, 37, 56)
    ws.Range(ws.Cells(lastRow, 2), ws.Cells(lastRow, 7)).Font.Color = RGB(255, 255, 255)
    ws.Range(ws.Cells(lastRow, 2), ws.Cells(lastRow, 7)).Borders.LineStyle = 1
End Sub

Sub DeleteDeviceRow()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Worksheets("Devices")
    Dim lastRow As Long
    lastRow = ws.Cells(ws.Rows.Count, "B").End(xlUp).Row

    If lastRow > 4 Then
        ws.Rows(lastRow).Delete
    End If
End Sub

Sub AddRoutingRow()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Worksheets("Routing")
    Dim lastRow As Long
    lastRow = ws.Cells(ws.Rows.Count, "B").End(xlUp).Row

    lastRow = lastRow + 1
    ws.Cells(lastRow, 2).Value = lastRow - 4
    ws.Cells(lastRow, 3).Value = ""
    ws.Cells(lastRow, 4).Value = ""
    ws.Cells(lastRow, 5).Value = ChrW(&H2192)
    ws.Cells(lastRow, 6).Value = ""
    ws.Cells(lastRow, 7).Value = ""
    ws.Cells(lastRow, 8).Value = ""
    ws.Cells(lastRow, 9).Value = "Inactive"

    ws.Range(ws.Cells(lastRow, 2), ws.Cells(lastRow, 9)).Interior.Color = RGB(37, 37, 56)
    ws.Range(ws.Cells(lastRow, 2), ws.Cells(lastRow, 9)).Font.Color = RGB(255, 255, 255)
    ws.Range(ws.Cells(lastRow, 2), ws.Cells(lastRow, 9)).Borders.LineStyle = 1
    ws.Cells(lastRow, 5).Font.Color = RGB(0, 255, 0)
    ws.Cells(lastRow, 5).Font.Bold = True
End Sub

Sub DeleteRoutingRow()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Worksheets("Routing")
    Dim lastRow As Long
    lastRow = ws.Cells(ws.Rows.Count, "B").End(xlUp).Row

    If lastRow > 4 Then
        ws.Rows(lastRow).Delete
    End If
End Sub
'''

        # Add VBA module
        vb_module = wb.VBProject.VBComponents.Add(1)  # 1 = vbext_ct_StdModule
        vb_module.Name = "RowManager"
        vb_module.CodeModule.AddFromString(vba_code)

        # ===== ADD BUTTONS =====
        # Devices sheet buttons
        ws.Activate()

        # Add Row button
        btn_add = ws.Buttons.Add(ws.Cells(3, 7).Left, ws.Cells(3, 7).Top, 60, 20)
        btn_add.Name = "btnAddDevice"
        btn_add.Caption = "+ Add"
        btn_add.OnAction = "AddDeviceRow"

        # Delete Row button
        btn_del = ws.Buttons.Add(ws.Cells(3, 7).Left + 65, ws.Cells(3, 7).Top, 60, 20)
        btn_del.Name = "btnDelDevice"
        btn_del.Caption = "- Delete"
        btn_del.OnAction = "DeleteDeviceRow"

        # Routing sheet buttons
        ws2.Activate()

        btn_add2 = ws2.Buttons.Add(ws2.Cells(3, 9).Left, ws2.Cells(3, 9).Top, 60, 20)
        btn_add2.Name = "btnAddRoute"
        btn_add2.Caption = "+ Add"
        btn_add2.OnAction = "AddRoutingRow"

        btn_del2 = ws2.Buttons.Add(ws2.Cells(3, 9).Left + 65, ws2.Cells(3, 9).Top, 60, 20)
        btn_del2.Name = "btnDelRoute"
        btn_del2.Caption = "- Delete"
        btn_del2.OnAction = "DeleteRoutingRow"

        # Save as macro-enabled workbook
        wb.SaveAs(os.path.abspath(output_path), FileFormat=52)  # 52 = xlOpenXMLWorkbookMacroEnabled
        print(f"AV Router (macro-enabled) created: {output_path}")

    finally:
        wb.Close(SaveChanges=False)
        excel.Quit()

    return output_path

if __name__ == "__main__":
    create_av_router_macro()
