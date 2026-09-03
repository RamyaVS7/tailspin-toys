import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getGamesByCategory,
    getGamesByPublisher,
    getGamesByFilters,
    getAllCategories,
    getAllPublishers,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

async function seedMultipleCategoriesAndPublishers(db: Database): Promise<{
    categories: Array<{ id: number; name: string }>;
    publishers: Array<{ id: number; name: string }>;
}> {
    const [cat1] = await db
        .insert(categories)
        .values({ name: 'Action', description: 'Action games' })
        .returning({ id: categories.id });
    const [cat2] = await db
        .insert(categories)
        .values({ name: 'Puzzle', description: 'Puzzle games' })
        .returning({ id: categories.id });
    const [cat3] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'Strategy games' })
        .returning({ id: categories.id });

    const [pub1] = await db
        .insert(publishers)
        .values({ name: 'Publisher A', description: 'Pub A' })
        .returning({ id: publishers.id });
    const [pub2] = await db
        .insert(publishers)
        .values({ name: 'Publisher B', description: 'Pub B' })
        .returning({ id: publishers.id });

    // Create games: cat1+pub1, cat2+pub1, cat3+pub2, cat1+pub2
    await db.insert(games).values([
        { title: 'Action Game A', description: 'Desc 1', starRating: 4.5, categoryId: cat1.id, publisherId: pub1.id },
        { title: 'Action Game B', description: 'Desc 2', starRating: 4.2, categoryId: cat1.id, publisherId: pub2.id },
        { title: 'Puzzle Game', description: 'Desc 3', starRating: 3.8, categoryId: cat2.id, publisherId: pub1.id },
        { title: 'Strategy Game', description: 'Desc 4', starRating: 4.7, categoryId: cat3.id, publisherId: pub2.id },
    ]);

    return { categories: [cat1, cat2, cat3], publishers: [pub1, pub2] };
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('filters games by single category', async () => {
        const { categories: cats } = await seedMultipleCategoriesAndPublishers(db);
        const filtered = await getGamesByCategory(db, [cats[0].id]);
        expect(filtered.length).toBe(2);
        expect(filtered.map((g) => g.title)).toEqual(['Action Game A', 'Action Game B']);
    });

    it('filters games by multiple categories (OR logic)', async () => {
        const { categories: cats } = await seedMultipleCategoriesAndPublishers(db);
        const filtered = await getGamesByCategory(db, [cats[0].id, cats[1].id]);
        expect(filtered.length).toBe(3);
        expect(filtered.map((g) => g.title).sort()).toEqual(['Action Game A', 'Action Game B', 'Puzzle Game']);
    });

    it('returns all games when category filter is empty', async () => {
        await seedMultipleCategoriesAndPublishers(db);
        const filtered = await getGamesByCategory(db, []);
        expect(filtered.length).toBe(4);
    });

    it('filters games by single publisher', async () => {
        const { publishers: pubs } = await seedMultipleCategoriesAndPublishers(db);
        const filtered = await getGamesByPublisher(db, [pubs[0].id]);
        expect(filtered.length).toBe(2);
        expect(filtered.map((g) => g.title).sort()).toEqual(['Action Game A', 'Puzzle Game']);
    });

    it('filters games by multiple publishers (OR logic)', async () => {
        const { publishers: pubs } = await seedMultipleCategoriesAndPublishers(db);
        const filtered = await getGamesByPublisher(db, [pubs[0].id, pubs[1].id]);
        expect(filtered.length).toBe(4);
    });

    it('returns all games when publisher filter is empty', async () => {
        await seedMultipleCategoriesAndPublishers(db);
        const filtered = await getGamesByPublisher(db, []);
        expect(filtered.length).toBe(4);
    });

    it('filters games by category only', async () => {
        const { categories: cats } = await seedMultipleCategoriesAndPublishers(db);
        const filtered = await getGamesByFilters(db, { categoryIds: [cats[0].id] });
        expect(filtered.length).toBe(2);
        expect(filtered.map((g) => g.title).sort()).toEqual(['Action Game A', 'Action Game B']);
    });

    it('filters games by publisher only', async () => {
        const { publishers: pubs } = await seedMultipleCategoriesAndPublishers(db);
        const filtered = await getGamesByFilters(db, { publisherIds: [pubs[0].id] });
        expect(filtered.length).toBe(2);
        expect(filtered.map((g) => g.title).sort()).toEqual(['Action Game A', 'Puzzle Game']);
    });

    it('filters games by both category and publisher (AND logic)', async () => {
        const { categories: cats, publishers: pubs } = await seedMultipleCategoriesAndPublishers(db);
        const filtered = await getGamesByFilters(db, {
            categoryIds: [cats[0].id],
            publisherIds: [pubs[0].id],
        });
        expect(filtered.length).toBe(1);
        expect(filtered[0].title).toBe('Action Game A');
    });

    it('filters games by multiple categories and publishers (AND logic)', async () => {
        const { categories: cats, publishers: pubs } = await seedMultipleCategoriesAndPublishers(db);
        const filtered = await getGamesByFilters(db, {
            categoryIds: [cats[0].id, cats[1].id],
            publisherIds: [pubs[0].id],
        });
        expect(filtered.length).toBe(2);
        expect(filtered.map((g) => g.title).sort()).toEqual(['Action Game A', 'Puzzle Game']);
    });

    it('returns all games when no filters provided', async () => {
        await seedMultipleCategoriesAndPublishers(db);
        const filtered = await getGamesByFilters(db, {});
        expect(filtered.length).toBe(4);
    });

    it('returns empty array when no games match filter combination', async () => {
        const { categories: cats, publishers: pubs } = await seedMultipleCategoriesAndPublishers(db);
        const filtered = await getGamesByFilters(db, {
            categoryIds: [cats[2].id], // Strategy only has pub2
            publisherIds: [pubs[0].id], // pub1 only has Action and Puzzle
        });
        expect(filtered.length).toBe(0);
    });

    it('retrieves all categories ordered by name', async () => {
        await seedMultipleCategoriesAndPublishers(db);
        const allCats = await getAllCategories(db);
        expect(allCats.length).toBe(3);
        expect(allCats.map((c) => c.name)).toEqual(['Action', 'Puzzle', 'Strategy']);
    });

    it('retrieves all publishers ordered by name', async () => {
        await seedMultipleCategoriesAndPublishers(db);
        const allPubs = await getAllPublishers(db);
        expect(allPubs.length).toBe(2);
        expect(allPubs.map((p) => p.name)).toEqual(['Publisher A', 'Publisher B']);
    });
});
