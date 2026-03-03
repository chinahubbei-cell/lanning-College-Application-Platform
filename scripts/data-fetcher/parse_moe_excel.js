const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// This script reads the official MOE excel file and generates SQL to insert missing universities
// Data source: 教育部关于公布2024年全国普通高等学校名单的通知
// Example row in Excel: 序号 | 学校名称 | 学校标识码 | 主管部门 | 所在地 | 办学层次 | 备注

async function main() {
    const excelPath = path.join(__dirname, 'moe_universities.xlsx');

    if (!fs.existsSync(excelPath)) {
        console.error(`Error: File not found at ${excelPath}`);
        console.error('Please download the official list from http://www.moe.gov.cn/ and save as moe_universities.xlsx');
        return;
    }

    console.log('Reading Excel file...');
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    // Find header row index
    let headerIdx = -1;
    for (let i = 0; i < Math.min(20, data.length); i++) {
        if (data[i] && data[i].join('').includes('学校名称')) {
            headerIdx = i;
            break;
        }
    }

    if (headerIdx === -1) {
        console.error('Could not find header row');
        return;
    }

    const universities = [];
    for (let i = headerIdx + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[1]) continue; // Skip empty rows

        const name = row[1].toString().trim();
        if (!name) continue;

        const code = row[2] ? row[2].toString().trim() : '';
        const dept = row[3] ? row[3].toString().trim() : '';
        const city = row[4] ? row[4].toString().trim() : '';
        const levelStr = row[5] ? row[5].toString().trim() : '';
        const note = row[6] ? row[6].toString().trim() : '';

        // Only keep undergraduate (本科)
        if (levelStr !== '本科') continue;

        // Determine Type and Level loosely
        const isPrivate = note.includes('民办') || note.includes('独立学院');
        let type = '综合';
        if (name.includes('理工') || name.includes('工程') || name.includes('科技') || name.includes('工业')) type = '理工';
        else if (name.includes('师范') || name.includes('教育')) type = '师范';
        else if (name.includes('农业') || name.includes('林业')) type = '农业';
        else if (name.includes('医药') || name.includes('中医') || name.includes('医科') || name.includes('药科')) type = '医药';
        else if (name.includes('财经') || name.includes('金融') || name.includes('商学') || name.includes('贸易')) type = '财经';
        else if (name.includes('政法') || name.includes('公安') || name.includes('警察') || name.includes('法学')) type = '政法';
        else if (name.includes('体育')) type = '体育';
        else if (name.includes('艺术') || name.includes('美术') || name.includes('音乐') || name.includes('戏剧')) type = '艺术';
        else if (name.includes('民族')) type = '民族';
        else if (name.includes('语言') || name.includes('外国语')) type = '语言';

        universities.push({
            name,
            code,
            province: '', // Need to map city -> province, or query from existing data
            city,
            level: 'regular',
            type,
            master_dept: dept,
            is_private: isPrivate,
            is_985: false,
            is_211: false,
            is_double_first_class: false
        });
    }

    console.log(`Found ${universities.length} undergraduate universities`);

    // Here we would query the database to get existing names to filter duplicates,
    // but for simplicity in this script we output all as INSERT ON CONFLICT DO NOTHING
    // Assuming name is UNIQUE or code is UNIQUE (needs DB schema update)

    fs.writeFileSync('parsed_universities.json', JSON.stringify(universities, null, 2));
    console.log('Saved to parsed_universities.json');
}

main().catch(console.error);
