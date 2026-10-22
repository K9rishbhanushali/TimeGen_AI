from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.pdfbase.pdfmetrics import stringWidth

OUT = r'E:\timegen-ai\output\pdf\TimeGen_AI_Microproject_Report.pdf'
PAGE_W, PAGE_H = A4

navy = colors.HexColor('#0B1220')
ink = colors.HexColor('#172033')
muted = colors.HexColor('#53627A')
blue = colors.HexColor('#4F46E5')
violet = colors.HexColor('#7C3AED')
teal = colors.HexColor('#0F9D8A')
light = colors.HexColor('#F4F7FB')
line = colors.HexColor('#D9E0EA')

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleX', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=30, leading=36, textColor=navy, alignment=TA_CENTER, spaceAfter=12))
styles.add(ParagraphStyle(name='SubTitleX', parent=styles['Normal'], fontName='Helvetica', fontSize=13, leading=19, textColor=muted, alignment=TA_CENTER))
styles.add(ParagraphStyle(name='H1X', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=20, leading=25, textColor=navy, spaceAfter=12))
styles.add(ParagraphStyle(name='H2X', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=12, leading=16, textColor=blue, spaceBefore=8, spaceAfter=5))
styles.add(ParagraphStyle(name='BodyX', parent=styles['BodyText'], fontName='Helvetica', fontSize=10.3, leading=15.5, textColor=ink, spaceAfter=8))
styles.add(ParagraphStyle(name='BulletX', parent=styles['BodyText'], fontName='Helvetica', fontSize=10.2, leading=15, leftIndent=14, firstLineIndent=-9, textColor=ink, spaceAfter=4))
styles.add(ParagraphStyle(name='SmallX', parent=styles['BodyText'], fontName='Helvetica', fontSize=8.5, leading=11, textColor=muted))
styles.add(ParagraphStyle(name='BoxTitle', parent=styles['BodyText'], fontName='Helvetica-Bold', fontSize=10, leading=13, textColor=colors.white, alignment=TA_CENTER))
styles.add(ParagraphStyle(name='BoxText', parent=styles['BodyText'], fontName='Helvetica', fontSize=8.5, leading=11, textColor=colors.white, alignment=TA_CENTER))

def P(text, style='BodyX'):
    return Paragraph(text, styles[style])

def bullets(items):
    return [P('&bull; ' + item, 'BulletX') for item in items]

def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(navy)
    canvas.rect(0, PAGE_H - 22, PAGE_W, 22, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont('Helvetica-Bold', 8)
    canvas.drawString(42, PAGE_H - 15, 'TIMEGEN AI - AUTOMATIC COLLEGE TIMETABLE GENERATOR')
    canvas.setStrokeColor(line)
    canvas.line(42, 31, PAGE_W - 42, 31)
    canvas.setFillColor(muted)
    canvas.setFont('Helvetica', 8)
    canvas.drawString(42, 18, 'Microproject Report | Academic Year 2026-2027')
    canvas.drawRightString(PAGE_W - 42, 18, f'Page {doc.page}')
    canvas.restoreState()

def section(title, body=None):
    data = [P(title, 'H1X')]
    if body: data.append(P(body))
    return data

def info_table(rows, widths=(1.7*inch, 4.75*inch)):
    table = Table([[P(a, 'BodyX'), P(b, 'BodyX')] for a,b in rows], colWidths=widths, hAlign='LEFT')
    table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#E9EDFF')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), .35, line),
        ('LEFTPADDING', (0,0), (-1,-1), 9), ('RIGHTPADDING', (0,0), (-1,-1), 9),
        ('TOPPADDING', (0,0), (-1,-1), 7), ('BOTTOMPADDING', (0,0), (-1,-1), 7),
    ]))
    return table

def module_cards(items):
    data=[]
    for i in range(0, len(items), 2):
        row=[]
        for title, desc in items[i:i+2]:
            row.append([P(title, 'H2X'), P(desc, 'SmallX')])
        if len(row)==1: row.append('')
        data.append(row)
    table=Table(data, colWidths=[3.2*inch,3.2*inch], hAlign='LEFT')
    table.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),light), ('GRID',(0,0),(-1,-1),.5,line),
        ('VALIGN',(0,0),(-1,-1),'TOP'), ('LEFTPADDING',(0,0),(-1,-1),11), ('RIGHTPADDING',(0,0),(-1,-1),11),
        ('TOPPADDING',(0,0),(-1,-1),7), ('BOTTOMPADDING',(0,0),(-1,-1),8),
    ]))
    return table

def flow(labels):
    cells=[]
    for label, color in labels:
        cells.append(Paragraph(f'<b>{label}</b>', ParagraphStyle('flow', parent=styles['BoxTitle'], backColor=color, borderPadding=10)))
    t=Table([cells], colWidths=[6.35*inch/len(cells)]*len(cells), hAlign='LEFT')
    t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'MIDDLE'),('GRID',(0,0),(-1,-1),1,colors.white),('TOPPADDING',(0,0),(-1,-1),12),('BOTTOMPADDING',(0,0),(-1,-1),12)]))
    return t

story=[]
# Cover
story += [Spacer(1, .55*inch), P('MICROPROJECT', 'SubTitleX'), Spacer(1,.2*inch), P('TimeGen AI', 'TitleX'), P('Automatic College Timetable Generator', 'SubTitleX'), Spacer(1,.42*inch)]
story.append(flow([('DATA SETUP', blue), ('SMART SCHEDULING', violet), ('CONFLICT-FREE TIMETABLES', teal)]))
story += [Spacer(1,.48*inch), info_table([
    ('Program', 'B.Tech. Information Technology'), ('Year of Study', 'Third Year'), ('Semester', 'V'),
    ('Project Type', 'Full Stack Web Application'), ('Academic Year', '2026-2027'), ('Project', 'TimeGen AI - Automatic College Timetable Generator')
]), Spacer(1,.5*inch), P('Prepared as a Full Stack Application Development Lab microproject report.', 'SubTitleX'), PageBreak()]

# Title / abstract
story += section('1. Title')
story += [P('<b>TimeGen AI: Automatic College Timetable Generator</b>'), Spacer(1,.1*inch)]
story += section('2. Abstract')
story += [P('TimeGen AI is a web-based academic scheduling platform that helps colleges create and manage weekly timetables. Administrators define classrooms, laboratories, student classes, faculty, subjects, class-subject assignments, availability rules, and period timings. The scheduling engine then creates practical and theory sessions while preventing resource clashes.'), P('The system supports lab batch splits, two-period practical blocks, multiple teachers per subject, batch-specific teacher and laboratory assignments, capacity checks, locked sessions, conflict validation, and timetable views for classes, teachers, rooms, and labs. A clean dashboard and analytics workspace make the generated timetable easy to review and improve.'), PageBreak()]

# objectives
story += section('3. Objectives')
story += bullets([
    'Reduce the manual work and errors involved in preparing college timetables.',
    'Generate schedules that respect faculty availability, room capacity, and laboratory occupancy.',
    'Allow a teacher to be assigned to multiple subjects and allow a subject to have multiple eligible teachers.',
    'Schedule Batch A, Batch B, and other lab groups in parallel when separate teachers and laboratories are available.',
    'Provide clear class, teacher, room, and lab timetable views with conflict reporting.',
    'Support quick edits, locking of approved sessions, data export, and timetable analytics.'
])
story += [Spacer(1,.15*inch), *section('4. Technology Stack'), info_table([
    ('Frontend', 'React 19, TypeScript, Vite, Tailwind CSS'), ('Backend', 'Node.js, Express.js'),
    ('Database', 'MongoDB with local JSON fallback'), ('AI Support', 'Google Gemini SDK'),
    ('UI and Charts', 'Lucide React, Motion, Recharts'), ('Build Tools', 'npm, esbuild, TypeScript')
]), PageBreak()]

# modules
story += section('5. Modules')
story += [module_cards([
    ('5.1 Master Data', 'Create and maintain classrooms, laboratories, student classes, batches, teachers, and subjects.'),
    ('5.2 Class Assignments', 'Map subjects to classes with weekly theory/practical hours, eligible teachers, and lab requirements.'),
    ('5.3 Batch Practical Setup', 'Assign different teachers and labs per batch, enabling parallel practical sessions without double booking.'),
    ('5.4 Timing and Availability', 'Configure college hours, periods, breaks, working days, and resource availability rules.'),
    ('5.5 Timetable Solver', 'Build theory and practical activities and place them in compatible time slots and venues.'),
    ('5.6 Validator', 'Detect teacher, class, batch, room, laboratory, capacity, availability, and workload conflicts.')
]), Spacer(1,.18*inch), module_cards([
    ('5.7 Timetable Workspace', 'View, edit, lock, and delete timetable sessions through a weekly interactive grid.'),
    ('5.8 Dashboard and Analytics', 'Review scheduling progress, quality score, utilization, workload, and recent solver runs.'),
    ('5.9 AI Assistant', 'Use Gemini-powered guidance to explain scheduling issues and proposed actions.'),
    ('5.10 Export and Settings', 'Export timetable data and manage demo data or the project database.')
]), PageBreak()]

# architecture
story += section('6. System Architecture')
story += [P('TimeGen AI follows a client-server architecture. The React frontend calls Express REST APIs. The server stores master data in MongoDB when configured, or in a local JSON store for development. The solver receives normalized scheduling inputs, generates entries, validates the result, and returns the timetable and quality report.'), Spacer(1,.2*inch), flow([('REACT UI', blue), ('EXPRESS API', violet), ('SOLVER + VALIDATOR', teal), ('MONGODB / JSON', blue)]), Spacer(1,.25*inch), P('<b>Data flow:</b> Administrator setup -> class-subject assignment -> timetable generation -> conflict validation -> timetable review and edits.'), PageBreak()]

# implementation
story += section('7. Implementation Details')
story += [P('Each class-subject assignment stores the class, subject, selected teacher list, weekly theory hours, weekly practical hours, and lab configuration. Existing assignments retain a primary teacher for compatibility, while the selected teacher list makes it possible to rotate or allocate instructors for the same subject.'), P('For practicals, the system creates two-period blocks. When a class requires batches, it generates an activity for each batch. Batch-level teacher and lab overrides allow Batch A and Batch B to start together in different laboratories. The solver rejects a placement if the selected teacher, batch, classroom, or laboratory is already occupied, unavailable, or below the required capacity.'), P('After generation, the validator calculates a quality score and reports hard conflicts and teacher workload warnings. Sessions may be locked so future timetable generation preserves approved entries.'), PageBreak()]

# feature scenarios
story += section('8. Key Scheduling Scenarios')
story += [info_table([
    ('One teacher, many subjects', 'The same teacher may be selected in separate assignments for Java, Python, Web Development, or any other subjects. The solver prevents overlapping sessions.'),
    ('One subject, many teachers', 'Select multiple eligible teachers for the same class-subject assignment. The solver can distribute sessions among selected teachers.'),
    ('Parallel lab batches', 'Assign Batch A to Lab 1 with Teacher 1 and Batch B to Lab 2 with Teacher 2. Both practical blocks can use the same day and time.'),
    ('Capacity-safe allocation', 'A laboratory is considered only when its bench capacity meets the batch size.'),
    ('Protected sessions', 'Lock manually approved sessions; generation retains them and schedules remaining activities around them.')
]), Spacer(1,.25*inch), P('This design ensures that parallel sessions are allowed only when they are physically and academically possible. One teacher is never placed in two rooms at the same time.'), PageBreak()]

# results
story += section('9. Results')
story += bullets([
    'A responsive dashboard provides a summary of classes, teachers, rooms, labs, subjects, assignments, and timetable quality.',
    'Master-data pages let staff add, edit, search, and delete timetable resources.',
    'The Class Subject Assignments page supports multiple teachers per subject and per-batch laboratory setup.',
    'The timetable grid shows theory sessions, two-hour practical blocks, batch labels, venue details, and validation status.',
    'Class, teacher, room, and lab views make it easy to audit resource utilization.',
    'The generator reports unscheduled activities and validation warnings for follow-up.'
])
story += [Spacer(1,.18*inch), P('Representative project interfaces: Dashboard, Classes, Teachers, Laboratories, Class Subject Assignments, Timetable, Analytics, Export, and Settings.', 'H2X'), PageBreak()]

# deploy
story += section('10. Deployment Steps')
story += [P('<b>Prerequisites:</b> Node.js 18 or later, npm, and MongoDB for persistent or cloud deployment.'), P('<b>Procedure:</b>'), *bullets([
    'Clone or download the TimeGen AI project.',
    'Run npm install in the project directory.',
    'Create .env or .env.local with GEMINI_API_KEY, MONGODB_URI, DATABASE_NAME, and APP_URL as needed.',
    'Start development mode with npm run dev and open http://localhost:3000.',
    'For production, run npm run build followed by npm run start.',
    'Deploy to Vercel or Render with MongoDB Atlas and required environment variables configured as secrets.'
]), PageBreak()]

# SDG
story += section('11. Mapping to Sustainable Development Goals')
story += [module_cards([
    ('SDG 4 - Quality Education', 'Reliable, conflict-free timetables improve the use of teaching time and learning resources.'),
    ('SDG 9 - Industry, Innovation and Infrastructure', 'The project digitizes academic operations with modern full-stack technology and automated decision logic.'),
    ('SDG 11 - Sustainable Cities and Communities', 'Better room and lab allocation improves institutional resource coordination.'),
    ('SDG 12 - Responsible Consumption and Production', 'Digital generation and export reduce paper-based scheduling, repeated printing, and resource waste.')
]), Spacer(1,.3*inch), *section('12. Conclusion'), P('TimeGen AI provides a practical solution for college timetable generation and management. It combines master-data administration, automated scheduling, resource-aware validation, batch practical support, and clear review tools in one application. With multiple-teacher assignments and separate parallel labs for batches, the system better reflects real academic operations while maintaining conflict-free schedules.'), Spacer(1,.25*inch), P('Future enhancements can include advanced optimization, teacher preference scoring, automated email notifications, academic-calendar integration, and cloud-hosted collaboration.', 'BodyX')]

doc = SimpleDocTemplate(OUT, pagesize=A4, rightMargin=42, leftMargin=42, topMargin=44, bottomMargin=42, title='TimeGen AI Microproject Report', author='TimeGen AI')
doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(OUT)
