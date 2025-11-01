
from flask import Flask, render_template, request, jsonify, send_file
import sqlite3, io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

app = Flask(__name__)
DB_PATH = "data/mgnrega_data.db"

def query_db(query, args=(), one=False):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(query, args)
    rv = cur.fetchall()
    conn.close()
    return (rv[0] if rv else None) if one else rv

@app.route('/')
def index():
    # pass district list for dropdown
    rows = query_db("SELECT district FROM mgnrega_latest ORDER BY district")
    districts = [r['district'] for r in rows]
    return render_template('index.html', districts=districts)

@app.route('/api/data')
def get_data():
    district = request.args.get('district')
    if not district:
        return jsonify({"error":"district param required"}), 400
    row = query_db("SELECT * FROM mgnrega_latest WHERE district=? LIMIT 1", (district,), one=True)
    if not row:
        return jsonify({"error":"No data found for this district."})
    rows = query_db("SELECT month, year, persondays, expenditure, projects_completed, active_workers FROM mgnrega_monthly WHERE district=? ORDER BY year, month", (district,))
    monthly = [{"month": r["month"], "year": r["year"], "persondays": r["persondays"], "expenditure": r["expenditure"], "projects_completed": r["projects_completed"], "active_workers": r["active_workers"]} for r in rows]
    return jsonify({
        "district": row["district"],
        "month": row["month"],
        "year": row["year"],
        "persondays": row["persondays"],
        "expenditure": row["expenditure"],
        "avg_wage": row["avg_wage"],
        "projects_completed": row["projects_completed"],
        "active_workers": row["active_workers"],
        "last_updated": row["last_updated"],
        "monthly": monthly
    })

@app.route('/api/all_data')
def all_data():
    rows = query_db("SELECT district, persondays, expenditure FROM mgnrega_latest")
    data = [{"district": r["district"], "persondays": r["persondays"], "expenditure": r["expenditure"]} for r in rows]
    return jsonify(data)

@app.route('/api/report')
def report_pdf():
    district = request.args.get('district')
    if not district:
        return jsonify({"error":"district required"}), 400
    data = query_db("SELECT * FROM mgnrega_latest WHERE district=? LIMIT 1", (district,), one=True)
    monthly = query_db("SELECT month, year, persondays, expenditure, projects_completed, active_workers FROM mgnrega_monthly WHERE district=? ORDER BY year, month", (district,))
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    p.setFont("Helvetica-Bold", 16)
    p.drawString(50, 800, f"MGNREGA Report - {district}")
    p.setFont("Helvetica", 11)
    p.drawString(50, 780, f"Latest Month: {data['month']} {data['year']}")
    p.drawString(50, 765, f"Total Persondays: {int(data['persondays'])}")
    p.drawString(50, 750, f"Total Expenditure: ₹{data['expenditure']} Crores")
    p.drawString(50, 735, f"Average Wage per Person: ₹{data['avg_wage']}")
    p.drawString(50, 720, f"Projects Completed: {int(data['projects_completed'])}")
    p.drawString(50, 705, f"Active Workers: {int(data['active_workers'])}")
    p.drawString(50, 685, "Monthly trend:")
    y = 670
    p.setFont("Helvetica", 10)
    for r in monthly:
        if y < 50:
            p.showPage()
            y = 800
        p.drawString(60, y, f"{r['month']}/{r['year']} - PD: {int(r['persondays'])}, Exp: ₹{r['expenditure']} Cr, Projects: {int(r['projects_completed'])}, Workers: {int(r['active_workers'])}")
        y -= 12
    p.showPage()
    p.save()
    buffer.seek(0)
    return send_file(buffer, as_attachment=True, download_name=f"MGNREGA_{district}_report.pdf", mimetype='application/pdf')

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
