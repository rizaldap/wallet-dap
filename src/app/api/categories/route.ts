import { NextResponse } from 'next/server';
import { getCurrentUser, createClient } from '@/lib/supabase/server';
import * as supabaseData from '@/lib/supabase/data';

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const categories = await supabaseData.getCategories(user.id);
        return NextResponse.json({ data: categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch categories' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const category = await supabaseData.createCategory({
            ...body,
            userId: user.id,
        });
        return NextResponse.json({ data: category });
    } catch (error) {
        console.error('Error creating category:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create category' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: 'Missing category id' }, { status: 400 });
        }

        const supabase = await createClient();
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting category:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete category' },
            { status: 500 }
        );
    }
}
