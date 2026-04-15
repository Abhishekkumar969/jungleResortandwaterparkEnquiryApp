import React, { useEffect, useState, useCallback } from "react";
import { db } from "../firebaseConfig";
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, } from "firebase/firestore";
import BackButton from "../components/BackButton";
import BottomNavigationBar from "../components/BottomNavigationBar";
import { useNavigate } from 'react-router-dom';
import styles from "../styles/BlogAdmin.module.css";

const BlogAdmin = () => {
    const navigate = useNavigate();
    const [blogs, setBlogs] = useState([]);

    const [form, setForm] = useState({
        title: "",
        slug: "",
        content: "",
        metaTitle: "",
        metaDescription: "",
        image: "",
        status: "draft",
    });

    const [editId, setEditId] = useState(null);

    const blogsRef = collection(db, "blogs");

    // 🔥 REALTIME FETCH (Best)
    const fetchBlogs = useCallback(() => {
        const unsubscribe = onSnapshot(blogsRef, (snapshot) => {
            setBlogs(
                snapshot.docs.map((doc) => ({
                    ...doc.data(),
                    id: doc.id,
                }))
            );
        });

        return unsubscribe;
    }, [blogsRef]);

    useEffect(() => {
        const unsubscribe = fetchBlogs();
        return () => unsubscribe();
    }, [fetchBlogs]);

    // 🔥 Slug generator
    const generateSlug = (title) => {
        return title
            .toLowerCase()
            .replace(/ /g, "-")
            .replace(/[^\w-]+/g, "");
    };

    // 🔥 Handle input
    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "title") {
            setForm({
                ...form,
                title: value,
                slug: generateSlug(value),
            });
        } else {
            setForm({ ...form, [name]: value });
        }
    };

    // 🔥 Add / Update blog
    const handleSubmit = async () => {
        if (!form.title || !form.content) {
            alert("Title & Content required");
            return;
        }

        try {
            if (editId) {
                await updateDoc(doc(db, "blogs", editId), {
                    ...form,
                    updatedAt: new Date(),
                });
                setEditId(null);
            } else {
                await addDoc(blogsRef, {
                    ...form,
                    createdAt: new Date(),
                });
            }

            // Reset form
            setForm({
                title: "",
                slug: "",
                content: "",
                metaTitle: "",
                metaDescription: "",
                image: "",
                status: "draft",
            });
        } catch (err) {
            console.error("Error saving blog:", err);
        }
    };

    // 🔥 Edit
    const handleEdit = (blog) => {
        setForm(blog);
        setEditId(blog.id);

        // 🔥 Smooth scroll to top
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    // 🔥 Delete
    const handleDelete = async (id) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this blog?");

        if (!confirmDelete) return;

        try {
            await deleteDoc(doc(db, "blogs", id));
        } catch (err) {
            console.error("Delete error:", err);
        }
    };

    return (
        <>
            <BackButton />

            <div style={{ padding: "50px 0px" }}>
                <div className={styles.container}>
                    <h2 className={styles.title}>📝 Blog Manager</h2>

                    <div className={`${styles.form} ${editId ? styles.formHighlight : ""}`}>

                        {/* TITLE */}
                        <div className={styles.field}>
                            <label className={styles.label}>Blog Title</label>
                            <span className={styles.helper}>Example: Best Wedding Venues in Patna (2026 Guide)</span>
                            <input
                                className={styles.input}
                                name="title"
                                placeholder="Enter blog title"
                                value={form.title}
                                onChange={handleChange}
                            />
                        </div>

                        {/* SLUG */}
                        <div className={styles.field}>
                            <label className={styles.label}>URL Slug</label>
                            <span className={styles.helper}>Example: best-wedding-venues-patna</span>
                            <input
                                className={styles.input}
                                name="slug"
                                placeholder="auto-generated-url"
                                value={form.slug}
                                onChange={handleChange}
                            />
                        </div>

                        {/* META TITLE */}
                        <div className={styles.field}>
                            <label className={styles.label}>Meta Title (SEO)</label>
                            <span className={styles.helper}>Example: Top Wedding Venues in Patna | Price & Booking</span>
                            <input
                                className={styles.input}
                                name="metaTitle"
                                placeholder="SEO title"
                                value={form.metaTitle}
                                onChange={handleChange}
                            />
                        </div>

                        {/* META DESCRIPTION */}
                        <div className={styles.field}>
                            <label className={styles.label}>Meta Description (SEO)</label>
                            <span className={styles.helper}>Example: Discover best wedding venues in Patna with pricing, photos & booking details.</span>
                            <input
                                className={styles.input}
                                name="metaDescription"
                                placeholder="SEO description"
                                value={form.metaDescription}
                                onChange={handleChange}
                            />
                        </div>

                        {/* IMAGE */}
                        <div className={styles.field}>
                            <label className={styles.label}>Featured Image URL</label>
                            <span className={styles.helper}>Example: https://yourwebsite.com/image.jpg</span>
                            <input
                                className={styles.input}
                                name="image"
                                placeholder="Paste image URL"
                                value={form.image}
                                onChange={handleChange}
                            />
                        </div>

                        {/* CONTENT */}
                        <div className={styles.field}>
                            <label className={styles.label}>Blog Content</label>
                            <span className={styles.helper}>Write full blog here (use headings, paragraphs, SEO keywords)</span>
                            <textarea
                                className={styles.textarea}
                                name="content"
                                rows={8}
                                placeholder="Write your blog content..."
                                value={form.content}
                                onChange={handleChange}
                            />
                        </div>

                        {/* STATUS */}
                        <div className={styles.field}>
                            <label className={styles.label}>Publish Status</label>
                            <span className={styles.helper}>Draft = hidden | Published = visible on website</span>
                            <select
                                className={styles.select}
                                name="status"
                                value={form.status}
                                onChange={handleChange}
                            >
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                            </select>
                        </div>

                        <button className={styles.button} onClick={handleSubmit}>
                            {editId ? "Update Blog" : "Publish Blog"}
                        </button>

                    </div>

                    <div className={styles.blogList}>
                        <h3>All Blogs</h3>

                        {blogs.map((blog) => (
                            <div key={blog.id} className={styles.blogCard}>
                                <div className={styles.blogContentWrapper}>

                                    {/* LEFT SIDE (TEXT) */}
                                    <div className={styles.blogText}>
                                        <h4 className={styles.blogTitle}>{blog.title}</h4>

                                        <p><strong>Slug:</strong> {blog.slug}</p>

                                        <p><strong>Meta Title:</strong> {blog.metaTitle}</p>

                                        <p><strong>Meta Description:</strong> {blog.metaDescription}</p>

                                        <p className={styles.contentPreview}>
                                            <strong>Content:</strong> {blog.content?.slice(0, 120)}...
                                        </p>

                                        <p className={styles.status}>Status: {blog.status}</p>

                                        {blog.createdAt && (
                                            <p className={styles.date}>
                                                Created: {new Date(blog.createdAt.seconds * 1000).toLocaleString()}
                                            </p>
                                        )}
                                    </div>

                                    {/* RIGHT SIDE (IMAGE) */}
                                    {blog.image && (
                                        <div className={styles.blogImageWrapper}>
                                            <img
                                                src={blog.image}
                                                alt="blog"
                                                className={styles.blogImage}
                                            />
                                        </div>
                                    )}

                                </div>

                                <div className={styles.actions}>
                                    <button
                                        className={styles.editBtn}
                                        onClick={() => handleEdit(blog)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className={styles.deleteBtn}
                                        onClick={() => handleDelete(blog.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>

            <BottomNavigationBar navigate={navigate} />

        </>
    );
};

export default BlogAdmin;