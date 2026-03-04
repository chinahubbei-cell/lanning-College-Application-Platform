export async function syncUniversityDetails(supabase: any) {
    console.log('Fetching gaokao.cn school list for detail enrichment...');

    // Step 1: Get gaokao school list to map name -> gkId
    const response = await fetch('https://static-data.gaokao.cn/www/2.0/school/list_v2.json');
    if (!response.ok) throw new Error(`Failed to fetch school list: HTTP ${response.status}`);
    const listData = await response.json();
    if (listData.code !== '0000' || !listData.data) throw new Error('Invalid response');

    const nameToGkId: Record<string, string> = {};
    for (const [gkId, info] of Object.entries(listData.data)) {
        nameToGkId[(info as any).name] = gkId;
    }

    // Step 2: Fetch universities from DB that are missing details
    const { data: unis, error: fetchError } = await supabase
        .from('universities')
        .select('id, name, description, website, logo_url, founding_year')
        .or('description.is.null,logo_url.is.null,website.is.null,founding_year.is.null')
        .limit(50); // Process 50 per run to stay within Edge Function time limits

    if (fetchError) throw fetchError;
    if (!unis || unis.length === 0) {
        return { recordsAdded: 0, message: 'All universities already have details.' };
    }

    console.log(`Found ${unis.length} universities needing enrichment.`);

    let enrichedCount = 0;

    for (const uni of unis) {
        const gkId = nameToGkId[uni.name];
        if (!gkId) continue;

        try {
            const res = await fetch(`https://static-data.gaokao.cn/www/2.0/school/${gkId}/info.json`);
            if (!res.ok) continue;
            const result = await res.json();
            if (result.code !== '0000' || !result.data) continue;

            const info = result.data;
            const update: Record<string, any> = {};

            if (!uni.description && info.content) {
                let desc = info.content.replace(/<[^>]+>/g, '').trim();
                if (desc.length > 2000) desc = desc.substring(0, 2000) + '...';
                update.description = desc;
            }
            if (!uni.website && info.site) update.website = info.site;
            if (!uni.logo_url && info.logo) update.logo_url = info.logo;
            if (!uni.founding_year && info.create_date) {
                const year = parseInt(info.create_date);
                if (year > 1000 && year < 2100) update.founding_year = year;
            }
            if (info.area) {
                const area = parseFloat(info.area);
                if (area > 0) update.campus_area = area;
            }
            if (info.num_student) {
                const count = parseInt(info.num_student);
                if (count > 0) update.student_count = count;
            }

            if (Object.keys(update).length > 0) {
                update.updated_at = new Date().toISOString();
                const { error: updateError } = await supabase
                    .from('universities')
                    .update(update)
                    .eq('id', uni.id);
                if (!updateError) enrichedCount++;
            }
        } catch (e) {
            console.error(`Error enriching ${uni.name}:`, e);
        }
    }

    return {
        recordsAdded: enrichedCount,
        message: `Enriched ${enrichedCount} of ${unis.length} universities with details.`
    };
}
