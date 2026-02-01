"""
AV Diagram with Movable Shapes and Anchor Connectors
Creates Excel with:
- Movable device boxes (shapes)
- Anchor points on edges for connections
- Connector lines between devices
- Add/delete controls
"""

import os
import sys

def create_av_diagram(output_path=None):
    if output_path is None:
        output_path = os.path.join(os.path.dirname(__file__), '..', '.tmp', 'av_diagram.xlsm')

    try:
        import win32com.client as win32
    except ImportError:
        print("ERROR: pywin32 not installed. Run: pip install pywin32")
        sys.exit(1)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    if os.path.exists(output_path):
        os.remove(output_path)

    excel = win32.gencache.EnsureDispatch('Excel.Application')
    excel.Visible = False
    excel.DisplayAlerts = False

    try:
        wb = excel.Workbooks.Add()

        def rgb(r, g, b):
            return r + (g * 256) + (b * 256 * 256)

        # ===== DIAGRAM SHEET =====
        ws = wb.Worksheets(1)
        ws.Name = "AV Diagram"
        ws.Tab.Color = rgb(68, 114, 196)

        # Dark background
        ws.Range("A1:Z50").Interior.Color = rgb(20, 20, 35)

        # Title
        ws.Range("B2").Value = "AV SYSTEM DIAGRAM"
        ws.Range("B2").Font.Bold = True
        ws.Range("B2").Font.Size = 16
        ws.Range("B2").Font.Color = rgb(255, 255, 255)

        # Instructions
        ws.Range("B3").Value = "Drag shapes to reposition. Use connectors to link anchor points."
        ws.Range("B3").Font.Color = rgb(150, 150, 150)
        ws.Range("B3").Font.Italic = True
        ws.Range("B3").Font.Size = 10

        # ===== DEVICE SHAPES =====
        # Shape constants
        msoShapeRoundedRectangle = 5
        msoShapeOval = 9
        msoConnectorStraight = 1
        msoConnectorElbow = 2

        devices = [
            {"name": "Laptop", "x": 50, "y": 100, "w": 140, "h": 80, "color": rgb(68, 114, 196), "outputs": ["HDMI", "USB-C"]},
            {"name": "Switcher", "x": 280, "y": 100, "w": 140, "h": 120, "color": rgb(123, 104, 238), "inputs": ["IN 1", "IN 2", "IN 3"], "outputs": ["OUT"]},
            {"name": "Display", "x": 510, "y": 100, "w": 140, "h": 80, "color": rgb(32, 178, 170), "inputs": ["HDMI"]},
            {"name": "Audio Mixer", "x": 280, "y": 280, "w": 140, "h": 100, "color": rgb(255, 99, 71), "inputs": ["CH1", "CH2"], "outputs": ["Main L", "Main R"]},
        ]

        shapes_dict = {}

        for dev in devices:
            # Main device shape
            shp = ws.Shapes.AddShape(msoShapeRoundedRectangle, dev["x"], dev["y"], dev["w"], dev["h"])
            shp.Name = dev["name"]
            shp.Fill.ForeColor.RGB = dev["color"]
            shp.Line.ForeColor.RGB = rgb(255, 255, 255)
            shp.Line.Weight = 2

            # Device title
            shp.TextFrame2.TextRange.Text = dev["name"]
            shp.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = rgb(255, 255, 255)
            shp.TextFrame2.TextRange.Font.Bold = True
            shp.TextFrame2.TextRange.Font.Size = 12
            shp.TextFrame2.TextRange.ParagraphFormat.Alignment = 2  # Center
            shp.TextFrame2.VerticalAnchor = 1  # Top

            shapes_dict[dev["name"]] = shp

            # ===== INPUT ANCHOR POINTS (Left edge) =====
            if "inputs" in dev:
                input_count = len(dev["inputs"])
                for i, inp in enumerate(dev["inputs"]):
                    # Calculate vertical position
                    y_offset = dev["h"] * (i + 1) / (input_count + 1)

                    # Small circle as anchor point on left edge
                    anchor = ws.Shapes.AddShape(msoShapeOval, dev["x"] - 8, dev["y"] + y_offset - 6, 12, 12)
                    anchor.Name = f"{dev['name']}_IN_{inp}"
                    anchor.Fill.ForeColor.RGB = rgb(46, 125, 50)  # Green for input
                    anchor.Line.ForeColor.RGB = rgb(255, 255, 255)
                    anchor.Line.Weight = 1

                    # Label
                    lbl = ws.Shapes.AddTextbox(1, dev["x"] - 50, dev["y"] + y_offset - 8, 40, 16)
                    lbl.Name = f"{dev['name']}_IN_{inp}_lbl"
                    lbl.TextFrame2.TextRange.Text = inp
                    lbl.TextFrame2.TextRange.Font.Size = 8
                    lbl.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = rgb(200, 200, 200)
                    lbl.TextFrame2.TextRange.ParagraphFormat.Alignment = 3  # Right
                    lbl.Fill.Visible = False
                    lbl.Line.Visible = False

            # ===== OUTPUT ANCHOR POINTS (Right edge) =====
            if "outputs" in dev:
                output_count = len(dev["outputs"])
                for i, out in enumerate(dev["outputs"]):
                    y_offset = dev["h"] * (i + 1) / (output_count + 1)

                    # Small circle as anchor point on right edge
                    anchor = ws.Shapes.AddShape(msoShapeOval, dev["x"] + dev["w"] - 4, dev["y"] + y_offset - 6, 12, 12)
                    anchor.Name = f"{dev['name']}_OUT_{out}"
                    anchor.Fill.ForeColor.RGB = rgb(21, 101, 192)  # Blue for output
                    anchor.Line.ForeColor.RGB = rgb(255, 255, 255)
                    anchor.Line.Weight = 1

                    # Label
                    lbl = ws.Shapes.AddTextbox(1, dev["x"] + dev["w"] + 10, dev["y"] + y_offset - 8, 50, 16)
                    lbl.Name = f"{dev['name']}_OUT_{out}_lbl"
                    lbl.TextFrame2.TextRange.Text = out
                    lbl.TextFrame2.TextRange.Font.Size = 8
                    lbl.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = rgb(200, 200, 200)
                    lbl.Fill.Visible = False
                    lbl.Line.Visible = False

        # ===== CONNECTOR LINES =====
        # Laptop HDMI -> Switcher IN 1
        conn1 = ws.Shapes.AddConnector(msoConnectorElbow, 0, 0, 0, 0)
        conn1.Name = "Conn_Laptop_Switcher"
        conn1.ConnectorFormat.BeginConnect(shapes_dict["Laptop"], 4)  # Right edge
        conn1.ConnectorFormat.EndConnect(shapes_dict["Switcher"], 2)  # Left edge
        conn1.Line.ForeColor.RGB = rgb(0, 255, 100)
        conn1.Line.Weight = 2
        conn1.Line.EndArrowheadStyle = 2  # Arrow

        # Switcher OUT -> Display
        conn2 = ws.Shapes.AddConnector(msoConnectorElbow, 0, 0, 0, 0)
        conn2.Name = "Conn_Switcher_Display"
        conn2.ConnectorFormat.BeginConnect(shapes_dict["Switcher"], 4)
        conn2.ConnectorFormat.EndConnect(shapes_dict["Display"], 2)
        conn2.Line.ForeColor.RGB = rgb(0, 255, 100)
        conn2.Line.Weight = 2
        conn2.Line.EndArrowheadStyle = 2

        # ===== DATA TABLE SHEET =====
        ws2 = wb.Worksheets.Add(After=wb.Worksheets(wb.Worksheets.Count))
        ws2.Name = "Device Data"
        ws2.Tab.Color = rgb(100, 100, 100)

        ws2.Range("A1:J30").Interior.Color = rgb(30, 30, 45)

        # Headers
        headers = ["Device", "Type", "Input Ports", "Output Ports", "X Pos", "Y Pos", "Color"]
        for i, h in enumerate(headers):
            cell = ws2.Cells(1, i + 1)
            cell.Value = h
            cell.Font.Bold = True
            cell.Font.Color = rgb(255, 255, 255)
            cell.Interior.Color = rgb(50, 50, 70)

        # Data rows
        for row, dev in enumerate(devices, 2):
            ws2.Cells(row, 1).Value = dev["name"]
            ws2.Cells(row, 2).Value = "Source" if "outputs" in dev and "inputs" not in dev else "Dest" if "inputs" in dev and "outputs" not in dev else "Processor"
            ws2.Cells(row, 3).Value = ", ".join(dev.get("inputs", []))
            ws2.Cells(row, 4).Value = ", ".join(dev.get("outputs", []))
            ws2.Cells(row, 5).Value = dev["x"]
            ws2.Cells(row, 6).Value = dev["y"]
            ws2.Cells(row, 7).Value = "Custom"
            for col in range(1, 8):
                ws2.Cells(row, col).Font.Color = rgb(200, 200, 200)

        # Save as regular xlsx (no macros needed for drag functionality)
        output_path = output_path.replace('.xlsm', '.xlsx')
        wb.SaveAs(os.path.abspath(output_path), FileFormat=51)  # 51 = xlsx
        print(f"AV Diagram created: {output_path}")

    finally:
        wb.Close(SaveChanges=False)
        excel.Quit()

    return output_path

if __name__ == "__main__":
    create_av_diagram()
