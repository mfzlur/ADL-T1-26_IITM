import { AppDataSource } from '../config/database';
import { Enrollment, EnrollmentStatus } from '../entities/Enrollment';
import { Masterclass } from '../entities/Masterclass';

const enrollmentRepo  = AppDataSource.getRepository(Enrollment);
const masterclassRepo = AppDataSource.getRepository(Masterclass);

export const getCoachAnalytics = async (coachId: string) => {

    // 1. All classes by this coach
    const classes = await masterclassRepo.find({
        where: { coach_id: coachId },
        order: { session_date: 'ASC' },
    });

    if (classes.length === 0) {
        return {
            kpis: { total_classes: 0, total_enrollments: 0, total_waitlisted: 0, avg_fill_rate: 0 },
            enrollment_per_class: [],
            daily_trend:          [],
            category_distribution: [],
        };
    }

    const classIds = classes.map(c => c.id);

    // 2. All enrollments for this coach's classes
    const allEnrollments = await enrollmentRepo
    .createQueryBuilder('e')
    .where('e.masterclass_id IN (:...ids)', { ids: classIds })
    .orderBy('e.enrolled_at', 'ASC')
    .getMany();

    const activeEnrollments    = allEnrollments.filter(e => e.status === EnrollmentStatus.ACTIVE);
    const waitlistedEnrollments = allEnrollments.filter(e => e.status === EnrollmentStatus.WAITLISTED);

    // 3. Enrollments per class (for bar chart)
    const enrollment_per_class = classes.map(mc => {
        const active    = activeEnrollments.filter(e => e.masterclass_id === mc.id).length;
        const waitlisted = waitlistedEnrollments.filter(e => e.masterclass_id === mc.id).length;
        const fillRate  = mc.capacity > 0 ? Math.round((active / mc.capacity) * 100) : 0;
        return {
            class_id:   mc.id,
            title:      mc.title.length > 28 ? mc.title.slice(0, 28) + '…' : mc.title,
                                             category:   mc.category,
                                             capacity:   mc.capacity,
                                             active,
                                             waitlisted,
                                             fill_rate:  fillRate,
        };
    });

    // 4. Daily enrollment trend — last 30 days (for line chart)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentEnrollments = activeEnrollments.filter(
        e => new Date(e.enrolled_at) >= thirtyDaysAgo
    );

    // Build a map of date → count
    const trendMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
        trendMap[key] = 0;
    }
    recentEnrollments.forEach(e => {
        const key = new Date(e.enrolled_at).toISOString().slice(0, 10);
        if (trendMap[key] !== undefined) trendMap[key]++;
    });

        const daily_trend = Object.entries(trendMap).map(([date, count]) => ({
            date,
            count,
        }));

        // 5. Category distribution (for doughnut)
        const categoryMap: Record<string, number> = {
            opening: 0, middlegame: 0, endgame: 0, tactics: 0
        };
        enrollment_per_class.forEach(c => {
            categoryMap[c.category] = (categoryMap[c.category] || 0) + c.active;
        });
        const category_distribution = Object.entries(categoryMap)
        .map(([category, count]) => ({ category, count }))
        .filter(c => c.count > 0);

        // 6. KPI summary
        const totalCapacity   = classes.reduce((s, c) => s + c.capacity, 0);
        const totalActive     = activeEnrollments.length;
        const avgFillRate     = totalCapacity > 0
        ? Math.round((totalActive / totalCapacity) * 100)
        : 0;

        return {
            kpis: {
                total_classes:     classes.length,
                total_enrollments: totalActive,
                total_waitlisted:  waitlistedEnrollments.length,
                avg_fill_rate:     avgFillRate,
            },
            enrollment_per_class,
            daily_trend,
            category_distribution,
        };
};
